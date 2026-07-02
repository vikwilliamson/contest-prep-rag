import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

const { mockVerify } = vi.hoisted(() => ({ mockVerify: vi.fn() }))

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
  cert: vi.fn(),
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken: mockVerify })),
}))

import { verifyIdToken } from '../lib/firebase-admin'

const request = (token?: string) =>
  new NextRequest('http://localhost/api/chat', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ uid: 'user-a' })
})

afterEach(() => vi.unstubAllEnvs())

describe('verifyIdToken uid whitelist', () => {
  it('rejects a verified uid that is not in ALLOWED_UIDS', async () => {
    vi.stubEnv('ALLOWED_UIDS', 'user-b,user-c')

    await expect(verifyIdToken(request('valid-token'))).rejects.toThrow()
  })

  it('returns a verified uid that is in ALLOWED_UIDS', async () => {
    vi.stubEnv('ALLOWED_UIDS', 'user-b, user-a')

    await expect(verifyIdToken(request('valid-token'))).resolves.toBe('user-a')
  })

  it('allows any verified uid when ALLOWED_UIDS is unset or empty', async () => {
    vi.stubEnv('ALLOWED_UIDS', '')

    await expect(verifyIdToken(request('valid-token'))).resolves.toBe('user-a')
  })

  it('rejects a request with no bearer token before hitting Firebase', async () => {
    await expect(verifyIdToken(request())).rejects.toThrow()
    expect(mockVerify).not.toHaveBeenCalled()
  })
})
