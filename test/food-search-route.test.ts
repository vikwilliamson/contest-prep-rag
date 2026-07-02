import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/foodSearch', () => ({ searchFoods: vi.fn() }))

import { searchFoods } from '../lib/foodSearch'

const get = async (url: string) => {
  const { GET } = await import('../app/api/food-search/route')
  return GET(new NextRequest(url))
}

describe('GET /api/food-search', () => {
  beforeEach(() => vi.clearAllMocks())

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
