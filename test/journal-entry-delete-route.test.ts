import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/entriesStore', () => ({ deleteEntry: vi.fn() }))

vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))

import { deleteEntry } from '../lib/entriesStore'
import { verifyIdToken } from '../lib/firebase-admin'

const ctx = (date: string, entryId: string) => ({
  params: Promise.resolve({ date, entryId }),
})

const makeDelete = () =>
  new NextRequest('http://localhost/api/journal/2026-06-25/entries/abc', {
    method: 'DELETE',
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyIdToken).mockResolvedValue('test-uid')
})

describe('DELETE /api/journal/[date]/entries/[entryId]', () => {
  it('returns 401 when the token is missing or invalid', async () => {
    vi.mocked(verifyIdToken).mockRejectedValue(new Error('Missing auth token'))

    const { DELETE } = await import(
      '../app/api/journal/[date]/entries/[entryId]/route'
    )
    const res = await DELETE(makeDelete(), ctx('2026-06-25', 'abc'))

    expect(res.status).toBe(401)
    expect(deleteEntry).not.toHaveBeenCalled()
  })

  it("atomically deletes the verified user's entry and returns ok", async () => {
    vi.mocked(deleteEntry).mockResolvedValue(undefined)

    const { DELETE } = await import(
      '../app/api/journal/[date]/entries/[entryId]/route'
    )
    const res = await DELETE(makeDelete(), ctx('2026-06-25', 'abc'))

    expect(res.status).toBe(200)
    expect(deleteEntry).toHaveBeenCalledWith('test-uid', '2026-06-25', 'abc')
  })
})
