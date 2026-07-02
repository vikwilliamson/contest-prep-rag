import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppLayout from '../app/(app)/layout'

// Auth guard is disabled (gated by proxy.ts instead), so the layout renders
// unconditionally — no auth state is consulted.

describe('App shell layout', () => {
  it('should render Chat and Journal tab links', () => {
    render(<AppLayout><div>child</div></AppLayout>)

    expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /journal/i })).toBeInTheDocument()
  })

  it('should render its children', () => {
    render(<AppLayout><div>child content</div></AppLayout>)

    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
