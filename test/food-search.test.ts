import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchFoods } from '../lib/foodSearch'

// ── Mock payloads shaped like the real APIs ───────────────────────────────────

const usdaFood = {
  fdcId: 171077,
  description: 'Chicken, breast, raw',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrientNumber: '208', unitName: 'KCAL', value: 120 },
    { nutrientNumber: '203', unitName: 'G', value: 22.5 },
    { nutrientNumber: '205', unitName: 'G', value: 0 },
    { nutrientNumber: '204', unitName: 'G', value: 2.6 },
    { nutrientNumber: '291', unitName: 'G', value: 0 },
    { nutrientNumber: '307', unitName: 'MG', value: 45 },
    { nutrientNumber: '306', unitName: 'MG', value: 334 },
    { nutrientNumber: '269', unitName: 'G', value: 0 },
    { nutrientNumber: '601', unitName: 'MG', value: 64 },
    { nutrientNumber: '301', unitName: 'MG', value: 5 },
    { nutrientNumber: '303', unitName: 'MG', value: 0.7 },
  ],
  foodMeasures: [{ disseminationText: '1 cup', gramWeight: 140 }],
}

const usdaResponse = (foods: unknown[] = [usdaFood]) => ({
  ok: true,
  json: async () => ({ foods }),
})

const offResponse = (products: unknown[] = []) => ({
  ok: true,
  json: async () => ({ products }),
})

// Routes fetch by URL; branch the mock on the host.
function stubFetch(
  usda: unknown = usdaResponse(),
  off: unknown = offResponse()
) {
  const mock = vi.fn((url: string) => {
    if (url.includes('usda')) return Promise.resolve(usda)
    if (url.includes('openfoodfacts')) return Promise.resolve(off)
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('searchFoods — USDA normalization', () => {
  it('maps a USDA food to the per-100g result contract with a grams portion', async () => {
    stubFetch()
    const results = await searchFoods('chicken breast')

    expect(results).toEqual([
      {
        id: 'usda-171077',
        source: 'usda',
        foodName: 'Chicken, breast, raw',
        calories: 120,
        protein: 22.5,
        carbs: 0,
        fat: 2.6,
        fiber: 0,
        sodium: 45,
        potassium: 334,
        sugar: 0,
        cholesterol: 64,
        calcium: 5,
        iron: 0.7,
        portions: [
          { label: '1 cup', grams: 140 },
          { label: 'grams', grams: 1 },
        ],
      },
    ])
  })
})

describe('searchFoods — USDA branded portions', () => {
  // Branded USDA foods carry their serving on servingSize/householdServingFullText
  // rather than foodMeasures.
  const brandedFood = {
    fdcId: 999,
    description: 'BRANDED CHICKEN',
    dataType: 'Branded',
    servingSize: 140,
    servingSizeUnit: 'g',
    householdServingFullText: '1 cup',
    foodNutrients: [{ nutrientNumber: '208', unitName: 'KCAL', value: 165 }],
  }

  it('extracts the branded serving size as a named portion', async () => {
    stubFetch(usdaResponse([brandedFood]), offResponse([]))
    const [result] = await searchFoods('branded')

    expect(result.portions).toEqual([
      { label: '1 cup', grams: 140 },
      { label: 'grams', grams: 1 },
    ])
  })

  it('ignores a non-gram (volume) branded serving size', async () => {
    stubFetch(
      usdaResponse([{ ...brandedFood, servingSizeUnit: 'ml' }]),
      offResponse([])
    )
    const [result] = await searchFoods('branded')

    expect(result.portions).toEqual([{ label: 'grams', grams: 1 }])
  })
})

describe('searchFoods — Open Food Facts normalization', () => {
  const offProduct = {
    code: '3017620422003',
    product_name: 'Hazelnut spread',
    serving_size: '15 g',
    serving_quantity: 15,
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
      fiber_100g: 0,
      sugars_100g: 56.3,
      sodium_100g: 0.0428, // grams → 42.8 mg
      calcium_100g: 0.108, // grams → 108 mg
    },
  }

  it('maps an OFF product, converting mineral grams to mg, with serving + grams portions', async () => {
    stubFetch(usdaResponse([]), offResponse([offProduct]))
    const [result] = await searchFoods('hazelnut')

    expect(result).toMatchObject({
      id: 'off-3017620422003',
      source: 'off',
      foodName: 'Hazelnut spread',
      calories: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: 0,
      sugar: 56.3,
      sodium: 42.8,
      calcium: 108,
      potassium: null, // absent → null, not 0
      portions: [
        { label: '15 g', grams: 15 },
        { label: 'grams', grams: 1 },
      ],
    })
  })
})

describe('searchFoods — merge', () => {
  it('orders USDA results before Open Food Facts results', async () => {
    stubFetch(
      usdaResponse([usdaFood]),
      offResponse([
        { code: 'x', product_name: 'Branded thing', nutriments: {} },
      ])
    )
    const results = await searchFoods('thing')

    expect(results.map((r) => r.source)).toEqual(['usda', 'off'])
  })

  it('de-duplicates by name (case-insensitive), keeping the USDA entry', async () => {
    stubFetch(
      usdaResponse([usdaFood]), // "Chicken, breast, raw"
      offResponse([
        { code: 'dup', product_name: 'CHICKEN, BREAST, RAW', nutriments: {} },
        { code: 'keep', product_name: 'Unique snack', nutriments: {} },
      ])
    )
    const results = await searchFoods('chicken')

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['usda-171077', 'off-keep'])
  })
})

describe('searchFoods — resilience & fan-out', () => {
  const offProduct = { code: 'x', product_name: 'Branded thing', nutriments: {} }

  it('returns OFF results when USDA fails', async () => {
    stubFetch({ ok: false, status: 503 }, offResponse([offProduct]))
    const results = await searchFoods('thing')
    expect(results.map((r) => r.source)).toEqual(['off'])
  })

  it('returns USDA results when OFF fails', async () => {
    const mock = vi.fn((url: string) => {
      if (url.includes('usda')) return Promise.resolve(usdaResponse())
      return Promise.reject(new Error('network down'))
    })
    vi.stubGlobal('fetch', mock)

    const results = await searchFoods('chicken')
    expect(results.map((r) => r.source)).toEqual(['usda'])
  })

  it('initiates both API calls before either resolves', async () => {
    const mock = stubFetch()
    const pending = searchFoods('chicken') // do not await yet

    expect(mock).toHaveBeenCalledTimes(2)
    const urls = mock.mock.calls.map(([u]) => u as string)
    expect(urls.some((u) => u.includes('usda'))).toBe(true)
    expect(urls.some((u) => u.includes('openfoodfacts'))).toBe(true)

    await pending
  })
})
