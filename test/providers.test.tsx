import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/firebase', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
}))

import { Providers } from '../app/providers'
import { useAuth } from '../lib/auth-context'
import { onAuthStateChanged } from 'firebase/auth'

function Consumer() {
  const { loading } = useAuth()
  return <div>{loading ? 'loading' : 'ready'}</div>
}

describe('Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should wrap children in the Firebase-backed auth provider', () => {
    render(
      <Providers>
        <Consumer />
      </Providers>
    )

    // The real AuthProvider mounted and subscribed to Firebase auth state.
    expect(onAuthStateChanged).toHaveBeenCalledOnce()
    expect(screen.getByText('loading')).toBeInTheDocument()
  })
})
