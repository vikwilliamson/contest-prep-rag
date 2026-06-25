import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/firebase', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
}))

import { AuthProvider, useAuth } from '../lib/auth-context'
import { onAuthStateChanged } from 'firebase/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Consumer() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? `user:${user.uid}` : 'no-user'}</div>
}

/** Invoke the callback firebase's onAuthStateChanged was registered with. */
function emitAuthState(firebaseUser: { uid: string } | null) {
  const cb = vi.mocked(onAuthStateChanged).mock.calls[0][1] as (u: unknown) => void
  cb(firebaseUser)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should expose the authenticated user after Firebase reports sign-in', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    act(() => emitAuthState({ uid: 'abc' }))

    expect(screen.getByText('user:abc')).toBeInTheDocument()
  })

  it('should report no user once Firebase reports a signed-out state', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    act(() => emitAuthState(null))

    expect(screen.getByText('no-user')).toBeInTheDocument()
  })
})
