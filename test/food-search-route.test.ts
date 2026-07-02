import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/foodSearch', () => ({ searchFoods: vi.fn() }))

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))

import { searchFoods } from '../lib/foodSearch'
import { verifyIdToken } from '../lib/firebase-admin'

const get = async (url: string) => {
  const { GET } = await import('../app/api/food-search/route')
  return GET(new NextRequest(url))
}

describe('GET /api/food-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
  })

  it('returns 401 when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const res = await get('http://localhost/api/food-search?q=chicken')

    expect(res.status).toBe(401)
    expect(searchFoods).not.toHaveBeenCalled()
  })

  it('returns the search results for a valid query', async () => {
    const results = [{ id: 'usda-1', source: 'usda', foodName: 'Chicken' }]
    vi.mocked(searchFoods).mockResolvedValue(results as never)

    const res = await get('http://localhost/api/food-search?q=chicken')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results })
    expect(searchFoods).toHaveBeenCalledWith('chicken')
  })

  it('returns 400 when q is missing', async () => {
    const res = await get('http://localhost/api/food-search')
    expect(res.status).toBe(400)
    expect(searchFoods).not.toHaveBeenCalled()
  })

  it('returns 400 when q is empty or whitespace', async () => {
    const res = await get('http://localhost/api/food-search?q=%20%20')
    expect(res.status).toBe(400)
    expect(searchFoods).not.toHaveBeenCalled()
  })
})
