import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatPage from '../app/(app)/chat/page'

describe('Chat page', () => {
  it('should render the upload panel and the chat interface', () => {
    render(<ChatPage />)

    expect(
      screen.getByRole('button', { name: /upload file/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
