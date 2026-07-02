import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from './helpers'

vi.mock('../lib/goalsStore', () => ({
  getGoals: vi.fn(),
  saveGoals: vi.fn(),
}))

import { getGoals, saveGoals } from '../lib/goalsStore'

const valid = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

describe('GET /api/journal/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the stored goals', async () => {
    vi.mocked(getGoals).mockResolvedValue(valid)

    const { GET } = await import('../app/api/journal/goals/route')
    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ goals: valid })
  })

  it('should return null goals when none exist', async () => {
    vi.mocked(getGoals).mockResolvedValue(null)

    const { GET } = await import('../app/api/journal/goals/route')
    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ goals: null })
  })
})

describe('PUT /api/journal/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save a valid goals payload', async () => {
    const { PUT } = await import('../app/api/journal/goals/route')
    const res = await PUT(makeRequest(valid, 'PUT'))

    expect(res.status).toBe(200)
    expect(saveGoals).toHaveBeenCalledWith('anonymous', valid)
  })

  it('should return 400 and not save when the payload is invalid', async () => {
    const { PUT } = await import('../app/api/journal/goals/route')
    const res = await PUT(makeRequest({ calories: 2400 }, 'PUT'))

    expect(res.status).toBe(400)
    expect(saveGoals).not.toHaveBeenCalled()
  })

  it('should return 400 for malformed JSON', async () => {
    const { NextRequest } = await import('next/server')
    const { PUT } = await import('../app/api/journal/goals/route')
    const req = new NextRequest('http://localhost/api/journal/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await PUT(req)

    expect(res.status).toBe(400)
  })
})
