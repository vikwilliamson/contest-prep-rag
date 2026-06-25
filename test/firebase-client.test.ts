import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: 'app' })),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
}))

describe('lib/firebase client module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign in by calling signInWithPopup with a GoogleAuthProvider', async () => {
    const { signInWithGoogle } = await import('../lib/firebase')
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth')

    await signInWithGoogle()

    expect(signInWithPopup).toHaveBeenCalledOnce()
    const provider = vi.mocked(signInWithPopup).mock.calls[0][1]
    expect(provider).toBeInstanceOf(GoogleAuthProvider)
  })

  it('should sign out via the firebase auth instance', async () => {
    const { signOut } = await import('../lib/firebase')
    const { signOut: firebaseSignOut, getAuth } = await import('firebase/auth')

    await signOut()

    expect(firebaseSignOut).toHaveBeenCalledOnce()
    expect(firebaseSignOut).toHaveBeenCalledWith(vi.mocked(getAuth).mock.results[0].value)
  })
})
