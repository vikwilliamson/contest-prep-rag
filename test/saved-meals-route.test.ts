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

import {
  listSavedMeals,
  createSavedMeal,
} from '../lib/savedMealsStore'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/journal/saved-meals', () => {
  it('returns the list of saved meals', async () => {
    vi.mocked(listSavedMeals).mockResolvedValue([
      { id: 'a', name: 'Breakky' },
      { id: 'b', name: 'Post-workout' },
    ])

    const { GET } = await import('../app/api/journal/saved-meals/route')
    const res = await GET()

    expect(res.status).toBe(200)
    const { meals } = await res.json()
    expect(listSavedMeals).toHaveBeenCalledWith('anonymous')
    expect(meals).toEqual([
      { id: 'a', name: 'Breakky' },
      { id: 'b', name: 'Post-workout' },
    ])
  })
})

describe('POST /api/journal/saved-meals', () => {
  const post = async (body: unknown) => {
    const { POST } = await import('../app/api/journal/saved-meals/route')
    return POST(
      new NextRequest('http://localhost/api/journal/saved-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    )
  }

  it('creates a saved meal and returns it', async () => {
    vi.mocked(createSavedMeal).mockResolvedValue({ id: 'new', name: 'Lunch prep' })

    const res = await post({ name: 'Lunch prep' })

    expect(res.status).toBe(200)
    expect(createSavedMeal).toHaveBeenCalledWith('anonymous', 'Lunch prep')
    const { meal } = await res.json()
    expect(meal).toEqual({ id: 'new', name: 'Lunch prep' })
  })

  it('returns 400 when name is missing or blank', async () => {
    expect((await post({})).status).toBe(400)
    expect((await post({ name: '   ' })).status).toBe(400)
    expect(createSavedMeal).not.toHaveBeenCalled()
  })
})
