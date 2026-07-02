import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/entriesStore', () => ({
  getEntries: vi.fn(),
  addEntry: vi.fn(),
  deleteEntry: vi.fn(),
}))

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))

import { getEntries, addEntry } from '../lib/entriesStore'
import { verifyIdToken } from '../lib/firebase-admin'

const ctx = (date: string) => ({ params: Promise.resolve({ date }) })

const entry = (over: Record<string, unknown>) => ({
  id: 'e', meal: 'lunch', foodName: 'f', servingDescription: 's', grams: 100,
  calories: 100, protein: 10, carbs: 5, fat: 2, fiber: 1, sodium: 50,
  potassium: 20, sugar: 3, cholesterol: 10, calcium: 5, iron: 1, ...over,
})

const food = {
  id: 'usda-1', source: 'usda', foodName: 'Chicken',
  calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74,
  potassium: 256, sugar: 0, cholesterol: 85, calcium: 15, iron: 1,
  portions: [{ label: 'grams', grams: 1 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
})

describe('auth', () => {
  it('returns 401 from GET when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { GET } = await import('../app/api/journal/[date]/entries/route')
    const res = await GET(
      new NextRequest('http://localhost/api/journal/2026-06-25/entries'),
      ctx('2026-06-25')
    )

    expect(res.status).toBe(401)
    expect(getEntries).not.toHaveBeenCalled()
  })

  it('returns 401 from POST when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { POST } = await import('../app/api/journal/[date]/entries/route')
    const res = await POST(
      new NextRequest('http://localhost/api/journal/2026-06-25/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food, meal: 'lunch', portion: { label: 'grams', grams: 1 }, quantity: 1 }),
      }),
      ctx('2026-06-25')
    )

    expect(res.status).toBe(401)
    expect(addEntry).not.toHaveBeenCalled()
  })
})

describe('GET /api/journal/[date]/entries', () => {
  it('returns the date entries grouped by meal', async () => {
    vi.mocked(getEntries).mockResolvedValue([
      entry({ id: 'a', meal: 'breakfast' }),
      entry({ id: 'b', meal: 'lunch' }),
      entry({ id: 'c', meal: 'lunch' }),
    ] as never)

    const { GET } = await import('../app/api/journal/[date]/entries/route')
    const res = await GET(
      new NextRequest('http://localhost/api/journal/2026-06-25/entries'),
      ctx('2026-06-25')
    )

    expect(res.status).toBe(200)
    const { entries } = await res.json()
    expect(getEntries).toHaveBeenCalledWith('test-uid', '2026-06-25')
    expect(entries.breakfast.map((e: { id: string }) => e.id)).toEqual(['a'])
    expect(entries.lunch.map((e: { id: string }) => e.id)).toEqual(['b', 'c'])
    expect(entries.dinner).toEqual([])
    expect(entries.snacks).toEqual([])
  })
})

describe('POST /api/journal/[date]/entries', () => {
  const post = async (body: unknown) => {
    const { POST } = await import('../app/api/journal/[date]/entries/route')
    return POST(
      new NextRequest('http://localhost/api/journal/2026-06-25/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      ctx('2026-06-25')
    )
  }

  it('computes the immutable snapshot and writes it', async () => {
    vi.mocked(addEntry).mockImplementation(
      async (_uid, _date, e) => ({ id: 'new', ...e }) as never
    )

    const res = await post({
      food, meal: 'lunch', portion: { label: 'grams', grams: 1 }, quantity: 200,
    })

    expect(res.status).toBe(200)
    const [, date, written] = vi.mocked(addEntry).mock.calls[0]
    expect(date).toBe('2026-06-25')
    expect(written).toMatchObject({
      meal: 'lunch',
      foodName: 'Chicken',
      grams: 200,
      calories: 330, // 165 * 2
      protein: 62, // 31 * 2
    })
    const { entry: saved } = await res.json()
    expect(saved.id).toBe('new')
  })

  it('returns 400 for an invalid meal and does not write', async () => {
    const res = await post({
      food, meal: 'brunch', portion: { label: 'grams', grams: 1 }, quantity: 1,
    })
    expect(res.status).toBe(400)
    expect(addEntry).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-positive quantity', async () => {
    const res = await post({
      food, meal: 'lunch', portion: { label: 'grams', grams: 1 }, quantity: 0,
    })
    expect(res.status).toBe(400)
    expect(addEntry).not.toHaveBeenCalled()
  })
})
