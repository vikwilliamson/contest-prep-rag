import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/savedMealsStore', () => ({
  listSavedMeals: vi.fn(),
  createSavedMeal: vi.fn(),
  renameSavedMeal: vi.fn(),
  deleteSavedMeal: vi.fn(),
  listSavedMealFoods: vi.fn(),
  addSavedMealFood: vi.fn(),
  deleteSavedMealFood: vi.fn(),
}))

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))

import { listSavedMealFoods, addSavedMealFood } from '../lib/savedMealsStore'
import { verifyIdToken } from '../lib/firebase-admin'

const ctx = (mealId: string) => ({ params: Promise.resolve({ mealId }) })

const food = {
  id: 'usda-1', source: 'usda', foodName: 'Oats',
  calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11,
  sodium: 6, potassium: 429, sugar: 1, cholesterol: 0, calcium: 54, iron: 5,
  portions: [{ label: '1 cup', grams: 90 }, { label: 'grams', grams: 1 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
})

describe('auth', () => {
  it('returns 401 from GET when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { GET } = await import('../app/api/journal/saved-meals/[mealId]/foods/route')
    const res = await GET(
      new NextRequest('http://localhost/api/journal/saved-meals/abc/foods'),
      ctx('abc')
    )

    expect(res.status).toBe(401)
    expect(listSavedMealFoods).not.toHaveBeenCalled()
  })

  it('returns 401 from POST when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { POST } = await import('../app/api/journal/saved-meals/[mealId]/foods/route')
    const res = await POST(
      new NextRequest('http://localhost/api/journal/saved-meals/abc/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food, portion: { label: 'grams', grams: 1 }, quantity: 90 }),
      }),
      ctx('abc')
    )

    expect(res.status).toBe(401)
    expect(addSavedMealFood).not.toHaveBeenCalled()
  })
})

describe('GET /api/journal/saved-meals/[mealId]/foods', () => {
  it('returns all foods in the saved meal', async () => {
    vi.mocked(listSavedMealFoods).mockResolvedValue([
      { id: 'f1', foodName: 'Oats', servingDescription: '1 cup (90g)', grams: 90,
        calories: 350, protein: 15, carbs: 59, fat: 6, fiber: 10,
        sodium: 5, potassium: 386, sugar: 1, cholesterol: 0, calcium: 49, iron: 5 },
    ])

    const { GET } = await import('../app/api/journal/saved-meals/[mealId]/foods/route')
    const res = await GET(
      new NextRequest('http://localhost/api/journal/saved-meals/abc/foods'),
      ctx('abc')
    )

    expect(res.status).toBe(200)
    const { foods } = await res.json()
    expect(listSavedMealFoods).toHaveBeenCalledWith('test-uid', 'abc')
    expect(foods).toHaveLength(1)
    expect(foods[0].foodName).toBe('Oats')
  })
})

describe('POST /api/journal/saved-meals/[mealId]/foods', () => {
  const post = async (mealId: string, body: unknown) => {
    const { POST } = await import('../app/api/journal/saved-meals/[mealId]/foods/route')
    return POST(
      new NextRequest(`http://localhost/api/journal/saved-meals/${mealId}/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      ctx(mealId)
    )
  }

  it('computes the snapshot and writes it to the foods subcollection', async () => {
    vi.mocked(addSavedMealFood).mockImplementation(
      async (_uid, _mealId, f) => ({ id: 'food-new', ...f }) as never
    )

    const res = await post('abc', {
      food,
      portion: { label: 'grams', grams: 1 },
      quantity: 90,
    })

    expect(res.status).toBe(200)
    expect(addSavedMealFood).toHaveBeenCalledTimes(1)
    const [, mealId, written] = vi.mocked(addSavedMealFood).mock.calls[0]
    expect(mealId).toBe('abc')
    expect(written.foodName).toBe('Oats')
    expect(written.grams).toBe(90)
    expect(written.calories).toBe(350.1) // 389 * 0.9
    // no meal field on a saved-meal food
    expect(written).not.toHaveProperty('meal')
    const { food: saved } = await res.json()
    expect(saved.id).toBe('food-new')
  })

  it('returns 400 for an invalid payload', async () => {
    const res = await post('abc', { food, portion: { label: 'grams', grams: 1 }, quantity: -1 })
    expect(res.status).toBe(400)
    expect(addSavedMealFood).not.toHaveBeenCalled()
  })
})
