import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRequest } from './helpers'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/firebase-admin', () => ({
  verifyIdToken: vi.fn().mockResolvedValue('test-uid'),
}))

vi.mock('../lib/documentProcessor', () => ({
  processDocument: vi.fn(),
}))

vi.mock('../lib/vectorStore', () => ({
  getVectorStore: vi.fn(),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Upload API Endpoint: auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when no auth token is provided', async () => {
    const { verifyIdToken } = await import('../lib/firebase-admin')
    vi.mocked(verifyIdToken).mockRejectedValueOnce(new Error('Missing auth token'))

    const { POST } = await import('../app/api/upload/route')
    const req = makeAuthRequest({})
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('should return 401 from DELETE when no auth token is provided', async () => {
    const { verifyIdToken } = await import('../lib/firebase-admin')
    vi.mocked(verifyIdToken).mockRejectedValueOnce(new Error('Missing auth token'))

    const { DELETE } = await import('../app/api/upload/route')
    const req = makeAuthRequest({}, 'DELETE')
    const res = await DELETE(req)

    expect(res.status).toBe(401)
  })
})
