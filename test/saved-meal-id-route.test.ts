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

import { renameSavedMeal, deleteSavedMeal } from '../lib/savedMealsStore'

const ctx = (mealId: string) => ({ params: Promise.resolve({ mealId }) })

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/journal/saved-meals/[mealId]', () => {
  const patch = async (mealId: string, body: unknown) => {
    const { PATCH } = await import('../app/api/journal/saved-meals/[mealId]/route')
    return PATCH(
      new NextRequest(`http://localhost/api/journal/saved-meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      ctx(mealId)
    )
  }

  it('renames the saved meal and returns ok', async () => {
    vi.mocked(renameSavedMeal).mockResolvedValue(undefined)

    const res = await patch('abc', { name: 'Renamed' })

    expect(res.status).toBe(200)
    expect(renameSavedMeal).toHaveBeenCalledWith('anonymous', 'abc', 'Renamed')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 400 when name is missing or blank', async () => {
    expect((await patch('abc', {})).status).toBe(400)
    expect((await patch('abc', { name: '' })).status).toBe(400)
    expect(renameSavedMeal).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/journal/saved-meals/[mealId]', () => {
  it('deletes the saved meal and returns ok', async () => {
    vi.mocked(deleteSavedMeal).mockResolvedValue(undefined)

    const { DELETE } = await import('../app/api/journal/saved-meals/[mealId]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/api/journal/saved-meals/abc', { method: 'DELETE' }),
      ctx('abc')
    )

    expect(res.status).toBe(200)
    expect(deleteSavedMeal).toHaveBeenCalledWith('anonymous', 'abc')
    expect(await res.json()).toEqual({ ok: true })
  })
})
