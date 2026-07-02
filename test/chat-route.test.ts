import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))
vi.mock('../lib/ragChain', () => ({ getRagChain: vi.fn() }))

import { verifyIdToken } from '../lib/firebase-admin'
import { getRagChain } from '../lib/ragChain'
import { fakeChainStream, makeAuthRequest, makeRequest } from './helpers'

beforeEach(() => vi.clearAllMocks())

describe('POST /api/chat auth', () => {
  it('returns 401 when the token is missing or invalid, without touching the chain', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { POST } = await import('../app/api/chat/route')
    const res = await POST(makeRequest({ question: 'What is my carb target?' }))

    expect(res.status).toBe(401)
    expect(getRagChain).not.toHaveBeenCalled()
  })

  it('answers with the chain scoped to the verified uid, not "anonymous"', async () => {
    vi.mocked(verifyIdToken).mockResolvedValue('user-123')
    vi.mocked(getRagChain).mockResolvedValue({
      stream: vi.fn().mockResolvedValue(fakeChainStream('Carbs: ', '200g.')),
    } as never)

    const { POST } = await import('../app/api/chat/route')
    const res = await POST(
      makeAuthRequest({ question: 'What is my carb target?' }, 'POST', 'user-123')
    )

    expect(res.status).toBe(200)
    expect(getRagChain).toHaveBeenCalledWith('user-123')
    expect(await res.text()).toContain('Carbs: 200g.')
  })
})
