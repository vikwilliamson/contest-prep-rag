// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/documentProcessor', () => ({
  processDocument: vi.fn(),
}))

vi.mock('../lib/vectorStore', () => ({
  getVectorStore: vi.fn(),
}))

vi.mock('../lib/firebase-admin', () => ({
  verifyIdToken: vi.fn(),
}))

vi.mock('fs/promises', async () => {
  const { makeFsMock } = await import('./helpers')
  return makeFsMock()
})

import { join } from 'path'
import { unlink, writeFile } from 'fs/promises'
import { verifyIdToken } from '../lib/firebase-admin'
import { processDocument } from '../lib/documentProcessor'
import { getVectorStore } from '../lib/vectorStore'

function makeUploadRequest(uid?: string): NextRequest {
  const formData = new FormData()
  formData.append(
    'file',
    new File(['%PDF-1.4 test content'], 'prep-plan.pdf', { type: 'application/pdf' })
  )
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    headers: uid ? { Authorization: `Bearer mock-token-${uid}` } : {},
    body: formData,
  })
}

beforeEach(() => vi.clearAllMocks())

describe('Upload API Endpoint: auth', () => {
  it('returns 401 for POST without a valid token', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { POST } = await import('../app/api/upload/route')
    const res = await POST(makeUploadRequest())

    expect(res.status).toBe(401)
  })

  it('returns 401 for DELETE without a valid token', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { DELETE } = await import('../app/api/upload/route')
    const res = await DELETE(
      new NextRequest('http://localhost/api/upload?filename=prep-plan.pdf', {
        method: 'DELETE',
      })
    )

    expect(res.status).toBe(401)
  })

  it('saves the upload under uploads/{uid}/{filename} for the verified user', async () => {
    vi.mocked(verifyIdToken).mockResolvedValue('user-123')
    vi.mocked(processDocument).mockResolvedValue([
      { pageContent: 'chunk', metadata: { source: 'prep-plan.pdf', chunkIndex: 0 } },
    ] as never)
    const addDocuments = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getVectorStore).mockResolvedValue({ addDocuments } as never)

    const { POST } = await import('../app/api/upload/route')
    const res = await POST(makeUploadRequest('user-123'))

    expect(res.status).toBe(200)
    const [path] = vi.mocked(writeFile).mock.calls[0]
    expect(path).toBe(join(process.cwd(), 'uploads', 'user-123', 'prep-plan.pdf'))
    expect(getVectorStore).toHaveBeenCalledWith('user-123')
  })

  it("removes the file from the verified user's own directory on DELETE", async () => {
    vi.mocked(verifyIdToken).mockResolvedValue('user-123')

    const { DELETE } = await import('../app/api/upload/route')
    const res = await DELETE(
      new NextRequest('http://localhost/api/upload?filename=prep-plan.pdf', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-token-user-123' },
      })
    )

    expect(res.status).toBe(200)
    expect(unlink).toHaveBeenCalledWith(
      join(process.cwd(), 'uploads', 'user-123', 'prep-plan.pdf')
    )
  })
})
