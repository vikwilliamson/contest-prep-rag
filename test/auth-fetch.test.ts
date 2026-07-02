import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/firebase', () => ({ getAuth: vi.fn() }))

import { getAuth } from '../lib/firebase'
import { authFetch } from '../lib/authFetch'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('authFetch', () => {
  it("attaches the signed-in user's ID token and preserves the caller's options", async () => {
    const getIdToken = vi.fn().mockResolvedValue('tok-123')
    vi.mocked(getAuth).mockReturnValue({ currentUser: { getIdToken } } as never)
    fetchMock.mockResolvedValue(new Response('ok'))

    const res = await authFetch('/api/journal/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"calories":2400}',
    })

    expect(await res.text()).toBe('ok')
    expect(fetchMock).toHaveBeenCalledWith('/api/journal/goals', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      },
      body: '{"calories":2400}',
    })
  })

  it('rejects without firing the request when no user is signed in', async () => {
    vi.mocked(getAuth).mockReturnValue({ currentUser: null } as never)

    await expect(authFetch('/api/journal/goals')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
