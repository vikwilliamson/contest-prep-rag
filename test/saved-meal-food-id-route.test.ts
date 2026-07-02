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

import { deleteSavedMealFood } from '../lib/savedMealsStore'

const ctx = (mealId: string, foodId: string) => ({
  params: Promise.resolve({ mealId, foodId }),
})

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/journal/saved-meals/[mealId]/foods/[foodId]', () => {
  it('deletes the food and returns ok', async () => {
    vi.mocked(deleteSavedMealFood).mockResolvedValue(undefined)

    const { DELETE } = await import('../app/api/journal/saved-meals/[mealId]/foods/[foodId]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/api/journal/saved-meals/abc/foods/f1', { method: 'DELETE' }),
      ctx('abc', 'f1')
    )

    expect(res.status).toBe(200)
    expect(deleteSavedMealFood).toHaveBeenCalledWith('anonymous', 'abc', 'f1')
    expect(await res.json()).toEqual({ ok: true })
  })
})
