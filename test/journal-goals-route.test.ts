import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from './helpers'

vi.mock('../lib/goalsStore', () => ({
  getGoals: vi.fn(),
  saveGoals: vi.fn(),
}))

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))

import { getGoals, saveGoals } from '../lib/goalsStore'
import { verifyIdToken } from '../lib/firebase-admin'

const valid = {
  calories: 2400, protein: 200, carbs: 250, fat: 70,
  fiber: 30, sodium: 2300, potassium: 3500, sugar: 50,
  cholesterol: 300, calcium: 1000, iron: 18,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
})

describe('auth', () => {
  it('returns 401 from GET when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { GET } = await import('../app/api/journal/goals/route')
    const res = await GET(makeRequest(undefined, 'GET'))

    expect(res.status).toBe(401)
    expect(getGoals).not.toHaveBeenCalled()
  })

  it('returns 401 from PUT when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { PUT } = await import('../app/api/journal/goals/route')
    const res = await PUT(makeRequest(valid, 'PUT'))

    expect(res.status).toBe(401)
    expect(saveGoals).not.toHaveBeenCalled()
  })
})

describe('GET /api/journal/goals', () => {
  it('should return the stored goals for the verified user', async () => {
    vi.mocked(getGoals).mockResolvedValue(valid)

    const { GET } = await import('../app/api/journal/goals/route')
    const res = await GET(makeRequest(undefined, 'GET'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ goals: valid })
    expect(getGoals).toHaveBeenCalledWith('test-uid')
  })

  it('should return null goals when none exist', async () => {
    vi.mocked(getGoals).mockResolvedValue(null)

    const { GET } = await import('../app/api/journal/goals/route')
    const res = await GET(makeRequest(undefined, 'GET'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ goals: null })
  })
})

describe('PUT /api/journal/goals', () => {
  it('should save a valid goals payload for the verified user', async () => {
    const { PUT } = await import('../app/api/journal/goals/route')
    const res = await PUT(makeRequest(valid, 'PUT'))

    expect(res.status).toBe(200)
    expect(saveGoals).toHaveBeenCalledWith('test-uid', valid)
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
