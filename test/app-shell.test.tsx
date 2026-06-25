import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import AppLayout from '../app/(app)/layout'
import { useAuth } from '../lib/auth-context'
import { redirect } from 'next/navigation'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App shell layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: an authenticated user
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'test-uid' }, loading: false })
  })

  it('should render Chat and Journal tab links when authenticated', () => {
    render(<AppLayout><div>child</div></AppLayout>)

    expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /journal/i })).toBeInTheDocument()
  })

  it('should render its children when authenticated', () => {
    render(<AppLayout><div>child content</div></AppLayout>)

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('should redirect to /login when the user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false })

    render(<AppLayout><div>child</div></AppLayout>)

    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('should not redirect while the auth state is still loading', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true })

    render(<AppLayout><div>child</div></AppLayout>)

    expect(redirect).not.toHaveBeenCalled()
  })
})
