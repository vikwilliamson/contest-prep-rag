import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FoodSearchModal from '../components/FoodSearchModal'

// authFetch delegates to the (stubbed) global fetch — token attachment is
// covered in auth-fetch.test.ts.
vi.mock('../lib/authFetch', () => ({
  authFetch: (...args: Parameters<typeof fetch>) => fetch(...args),
}))

const result = {
  id: 'usda-1',
  source: 'usda',
  foodName: 'Chicken breast',
  calories: 165, protein: 31, carbs: 0, fat: 3.6,
  fiber: 0, sodium: 74, potassium: 256, sugar: 0,
  cholesterol: 85, calcium: 15, iron: 1,
  portions: [
    { label: '1 cup', grams: 140 },
    { label: 'grams', grams: 1 },
  ],
}

const searchResponse = (results: unknown[]) => ({
  ok: true,
  json: async () => ({ results }),
})

function renderModal(props: Partial<Parameters<typeof FoodSearchModal>[0]> = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <FoodSearchModal meal="lunch" onConfirm={onConfirm} onClose={onClose} {...props} />
  )
  return { onConfirm, onClose }
}

async function search(query: string) {
  fireEvent.change(screen.getByLabelText(/search foods/i), {
    target: { value: query },
  })
  fireEvent.submit(screen.getByRole('search'))
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('FoodSearchModal — search', () => {
  it('fetches results for the typed query and lists name + macro summary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(searchResponse([result]))
    vi.stubGlobal('fetch', fetchMock)
    renderModal()

    await search('chicken breast')

    expect(await screen.findByText('Chicken breast')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/food-search?q=chicken%20breast'
    )
    // brief macro summary on the result row
    const summary = screen.getByText(/165 cal/i)
    expect(summary).toHaveTextContent(/31\s*g\s*P/i)
    expect(summary).toHaveTextContent(/3.6\s*g\s*F/i)
  })
})

describe('FoodSearchModal — selection & confirm', () => {
  async function openDetail() {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(searchResponse([result])))
    const handles = renderModal()
    await search('chicken')
    fireEvent.click(await screen.findByRole('button', { name: /chicken breast/i }))
    return handles
  }

  it('shows the full nutrition panel with all seven micros and a portion dropdown', async () => {
    await openDetail()

    for (const micro of [
      'Fiber', 'Sodium', 'Potassium', 'Sugar', 'Cholesterol', 'Calcium', 'Iron',
    ]) {
      expect(screen.getByText(micro)).toBeInTheDocument()
    }

    const portion = screen.getByLabelText('Portion')
    expect(portion).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '1 cup' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'grams' })).toBeInTheDocument()
  })

  it('confirms with the selected portion and quantity multiplier', async () => {
    const { onConfirm } = await openDetail()

    fireEvent.change(screen.getByLabelText('Portion'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    expect(onConfirm).toHaveBeenCalledWith({
      food: result,
      portion: { label: '1 cup', grams: 140 },
      quantity: 1.5,
    })
  })
})
