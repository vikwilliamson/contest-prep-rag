import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import Home from '../app/page'
import { redirect } from 'next/navigation'

describe('Root page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to /chat', () => {
    Home()
    expect(redirect).toHaveBeenCalledWith('/chat')
  })
})
