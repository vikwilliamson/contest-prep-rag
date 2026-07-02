import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest } from './helpers'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/documentProcessor', () => ({
  processDocument: vi.fn(),
}))

vi.mock('../lib/vectorStore', () => ({
  getVectorStore: vi.fn(),
}))

// Auth is currently disabled (gated by proxy.ts instead). The upload route no
// longer requires a token — these tests assert it reaches validation rather
// than rejecting unauthenticated requests.

describe('Upload API Endpoint: open access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not require auth — POST without a file reaches validation (400, not 401)', async () => {
    const { POST } = await import('../app/api/upload/route')
    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
  })

  it('should not require auth — DELETE without a filename reaches validation (400, not 401)', async () => {
    const { DELETE } = await import('../app/api/upload/route')
    const res = await DELETE(makeRequest({}, 'DELETE'))

    expect(res.status).toBe(400)
  })
})
