import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../lib/entriesStore', () => ({ deleteEntry: vi.fn() }))

import { deleteEntry } from '../lib/entriesStore'

const ctx = (date: string, entryId: string) => ({
  params: Promise.resolve({ date, entryId }),
})

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/journal/[date]/entries/[entryId]', () => {
  it('atomically deletes the entry and returns ok', async () => {
    vi.mocked(deleteEntry).mockResolvedValue(undefined)

    const { DELETE } = await import(
      '../app/api/journal/[date]/entries/[entryId]/route'
    )
    const res = await DELETE(
      new NextRequest('http://localhost/api/journal/2026-06-25/entries/abc', {
        method: 'DELETE',
      }),
      ctx('2026-06-25', 'abc')
    )

    expect(res.status).toBe(200)
    expect(deleteEntry).toHaveBeenCalledWith('anonymous', '2026-06-25', 'abc')
  })
})
