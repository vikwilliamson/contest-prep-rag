import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/firebase', () => ({
  signInWithGoogle: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
  signInWithEmail: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
  signUpWithEmail: vi.fn().mockResolvedValue({ user: { uid: 'test-uid' } }),
  sendPasswordReset: vi.fn().mockResolvedValue(undefined),
}))

import LoginPage from '../app/(auth)/login/page'
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '../lib/firebase'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render a Google sign-in button', () => {
    render(<LoginPage />)
    expect(
      screen.getByRole('button', { name: /sign in with google/i })
    ).toBeInTheDocument()
  })

  it('should call signInWithGoogle when the Google button is clicked', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledOnce())
  })

  it('should render accessible email and password fields', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should call signInWithEmail with the entered credentials on submit', async () => {
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() =>
      expect(signInWithEmail).toHaveBeenCalledWith('a@b.com', 'hunter2')
    )
  })

  it('should call signUpWithEmail when submitting in create-account mode', async () => {
    render(<LoginPage />)

    fireEvent.click(
      screen.getByRole('button', { name: /need an account\? sign up/i })
    )

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'new@b.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }))

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith('new@b.com', 'hunter2')
    )
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it('should call sendPasswordReset with the entered email', async () => {
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'forgot@b.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))

    await waitFor(() =>
      expect(sendPasswordReset).toHaveBeenCalledWith('forgot@b.com')
    )
  })

  it('should show an accessible error message when sign-in fails', async () => {
    vi.mocked(signInWithEmail).mockRejectedValueOnce(new Error('Wrong password'))
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong password/i)
  })
})
