import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../app/(auth)/login/page'

describe('Login page', () => {
  it('should render a Google sign-in button', () => {
    render(<LoginPage />)
    expect(
      screen.getByRole('button', { name: /sign in with google/i })
    ).toBeInTheDocument()
  })
})
