import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/chat',
}))

vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }))

vi.mock('../lib/firebase', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }))

import AppLayout from '../app/(app)/layout'
import { useAuth } from '../lib/auth-context'
import { signOut } from '../lib/firebase'

const signedIn = { user: { uid: 'abc' }, loading: false }
const signedOut = { user: null, loading: false }
const authLoading = { user: null, loading: true }

beforeEach(() => vi.clearAllMocks())

describe('App shell layout', () => {
  it('should render Chat and Journal tab links when signed in', () => {
    vi.mocked(useAuth).mockReturnValue(signedIn)
    render(<AppLayout><div>child</div></AppLayout>)

    expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /journal/i })).toBeInTheDocument()
  })

  it('should render its children when signed in', () => {
    vi.mocked(useAuth).mockReturnValue(signedIn)
    render(<AppLayout><div>child content</div></AppLayout>)

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('should render nothing and not redirect while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue(authLoading)
    render(<AppLayout><div>child content</div></AppLayout>)

    expect(screen.queryByText('child content')).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should redirect to /login and hide children when signed out', () => {
    vi.mocked(useAuth).mockReturnValue(signedOut)
    render(<AppLayout><div>secret content</div></AppLayout>)

    expect(mockReplace).toHaveBeenCalledWith('/login')
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('should mark the tab matching the current path as the active page', () => {
    // usePathname is mocked to /chat at the top of this file
    vi.mocked(useAuth).mockReturnValue(signedIn)
    render(<AppLayout><div>child</div></AppLayout>)

    expect(screen.getByRole('link', { name: /chat/i })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: /journal/i })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('should sign the user out when the sign-out control is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue(signedIn)
    render(<AppLayout><div>child</div></AppLayout>)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
  })
})
