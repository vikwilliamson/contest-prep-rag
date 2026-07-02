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

import { renameSavedMeal, deleteSavedMeal } from '../lib/savedMealsStore'
import { verifyIdToken } from '../lib/firebase-admin'

const ctx = (mealId: string) => ({ params: Promise.resolve({ mealId }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
})

describe('auth', () => {
  it('returns 401 from PATCH when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { PATCH } = await import('../app/api/journal/saved-meals/[mealId]/route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/journal/saved-meals/abc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed' }),
      }),
      ctx('abc')
    )

    expect(res.status).toBe(401)
    expect(renameSavedMeal).not.toHaveBeenCalled()
  })

  it('returns 401 from DELETE when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { DELETE } = await import('../app/api/journal/saved-meals/[mealId]/route')
    const res = await DELETE(
      new NextRequest('http://localhost/api/journal/saved-meals/abc', { method: 'DELETE' }),
      ctx('abc')
    )

    expect(res.status).toBe(401)
    expect(deleteSavedMeal).not.toHaveBeenCalled()
  })
})

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
    expect(renameSavedMeal).toHaveBeenCalledWith('test-uid', 'abc', 'Renamed')
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
    expect(deleteSavedMeal).toHaveBeenCalledWith('test-uid', 'abc')
    expect(await res.json()).toEqual({ ok: true })
  })
})
