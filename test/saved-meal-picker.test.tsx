import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SavedMealPicker from '../components/SavedMealPicker'
import type { SavedMealFood } from '../lib/savedMeals'

const meals = [
  { id: 'a', name: 'Breakky' },
  { id: 'b', name: 'Post-workout' },
]

const foods: SavedMealFood[] = [
  { id: 'f1', foodName: 'Oats', servingDescription: '1 × 1 cup (90g)', grams: 90,
    calories: 350, protein: 15, carbs: 59, fat: 6, fiber: 10,
    sodium: 5, potassium: 386, sugar: 1, cholesterol: 0, calcium: 49, iron: 5 },
  { id: 'f2', foodName: 'Eggs', servingDescription: '2 large (100g)', grams: 100,
    calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0,
    sodium: 142, potassium: 138, sugar: 1, cholesterol: 372, calcium: 56, iron: 2 },
]

function fetchRouter() {
  return vi.fn((url: string) => {
    if (url === '/api/journal/saved-meals')
      return Promise.resolve({ ok: true, json: async () => ({ meals }) })
    if (url.includes('/foods'))
      return Promise.resolve({ ok: true, json: async () => ({ foods }) })
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('SavedMealPicker', () => {
  it('lists saved meals by name', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    render(<SavedMealPicker meal="lunch" onClose={vi.fn()} onApply={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /breakky/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post-workout/i })).toBeInTheDocument()
  })

  it('calls onApply with all foods when a meal is selected', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    const onApply = vi.fn()
    render(<SavedMealPicker meal="lunch" onClose={vi.fn()} onApply={onApply} />)
    await screen.findByRole('button', { name: /breakky/i })

    fireEvent.click(screen.getByRole('button', { name: /breakky/i }))

    // wait for the foods fetch to complete
    await vi.waitFor(() => expect(onApply).toHaveBeenCalled())
    expect(onApply).toHaveBeenCalledWith(foods)
  })

  it('calls onClose when cancel is clicked', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    const onClose = vi.fn()
    render(<SavedMealPicker meal="lunch" onClose={onClose} onApply={vi.fn()} />)
    await screen.findByRole('button', { name: /breakky/i })

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalled()
  })
})
