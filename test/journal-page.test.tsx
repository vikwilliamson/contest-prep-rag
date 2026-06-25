import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import JournalPage from '../app/(app)/journal/page'

describe('Journal page', () => {
  it('should render a Journal heading', () => {
    render(<JournalPage />)
    expect(
      screen.getByRole('heading', { name: /journal/i })
    ).toBeInTheDocument()
  })
})
