import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ChatInterface from '../components/ChatInterface'

// ── Helpers ───────────────────────────────────────────────────────────────────

const encoder = new TextEncoder()

/** Returns a mock fetch that streams the given chunks one by one. */
function makeStreamingFetch(...chunks: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    body: new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
          await new Promise((r) => setImmediate(r))
        }
        controller.close()
      },
    }),
  })
}

/** Returns a mock fetch that responds with a non-ok JSON error. */
function makeErrorFetch(message = 'Internal server error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: message }),
  })
}

async function sendMessage(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Task 9: Frontend UI — Chat Interface', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('should render a placeholder when no messages exist', () => {
    render(<ChatInterface />)
    expect(screen.getByText(/ask something/i)).toBeInTheDocument()
  })

  it('should render a text input and a send button', () => {
    render(<ChatInterface />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  // ── Message display ────────────────────────────────────────────────────────

  it('should display a user message after sending', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Some answer.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('What is my carb target?') })

    expect(screen.getByText('What is my carb target?')).toBeInTheDocument()
  })

  it('should mark user and assistant messages with distinct roles', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Eat 200g.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Carbs?') })

    await waitFor(() => {
      expect(screen.getByText('Eat 200g.')).toBeInTheDocument()
    })

    const userMsg = screen.getByText('Carbs?').closest('[data-role="user"]')
    const assistantMsg = screen.getByText('Eat 200g.').closest('[data-role="assistant"]')
    expect(userMsg).toBeInTheDocument()
    expect(assistantMsg).toBeInTheDocument()
  })

  it('should display messages in the order they were sent', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('First answer.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('First question') })
    await waitFor(() => screen.getByText('First answer.'))

    const messages = screen.getAllByRole('article')
    expect(messages[0]).toHaveTextContent('First question')
    expect(messages[1]).toHaveTextContent('First answer.')
  })

  // ── Send functionality ─────────────────────────────────────────────────────

  it('should clear the input after sending', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('ok'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Test question') })

    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('should send a message when the Enter key is pressed', async () => {
    const fetchMock = makeStreamingFetch('ok')
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatInterface />)

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Protein target?' } })
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' })
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  })

  it('should not send when the input is empty', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatInterface />)

    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ── Streaming ──────────────────────────────────────────────────────────────

  it('should disable the input while a response is streaming', async () => {
    const encoder = new TextEncoder()
    let resolveStream!: () => void
    const pendingStream = new Promise<void>((r) => { resolveStream = r })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('Partial…'))
          await pendingStream
          controller.close()
        },
      }),
    }))

    render(<ChatInterface />)
    await act(async () => { await sendMessage('Question') })

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    await act(async () => { resolveStream() })

    await waitFor(() => {
      expect(screen.getByRole('textbox')).not.toBeDisabled()
    })
  })

  it('should render streaming chunks incrementally into the assistant message', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Eat ', '200g ', 'of protein.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Protein?') })

    await waitFor(() => {
      expect(screen.getByText('Eat 200g of protein.')).toBeInTheDocument()
    })
  })

  // ── Conversation history ───────────────────────────────────────────────────

  it('should persist all messages in the UI across multiple turns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('Answer one.')); c.close() } }) })
        .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('Answer two.')); c.close() } }) })
    )
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Question one') })
    await waitFor(() => screen.getByText('Answer one.'))

    await act(async () => { await sendMessage('Question two') })
    await waitFor(() => screen.getByText('Answer two.'))

    expect(screen.getByText('Question one')).toBeInTheDocument()
    expect(screen.getByText('Answer one.')).toBeInTheDocument()
    expect(screen.getByText('Question two')).toBeInTheDocument()
    expect(screen.getByText('Answer two.')).toBeInTheDocument()
  })

  it('should include prior exchanges as chat_history in subsequent requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('Answer one.')); c.close() } }) })
      .mockResolvedValueOnce({ ok: true, body: new ReadableStream({ start(c) { c.enqueue(encoder.encode('Answer two.')); c.close() } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Question one') })
    await waitFor(() => screen.getByText('Answer one.'))

    await act(async () => { await sendMessage('Question two') })
    await waitFor(() => screen.getByText('Answer two.'))

    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondCallBody.chat_history).toContain('Question one')
    expect(secondCallBody.chat_history).toContain('Answer one.')
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it('should display an error message when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', makeErrorFetch('Internal server error'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Test?') })

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  // ── Layout ─────────────────────────────────────────────────────────────────

  it('should render in a flex column layout with messages above the input', () => {
    const { container } = render(<ChatInterface />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/flex/)
    expect(root.className).toMatch(/flex-col/)
  })
})
