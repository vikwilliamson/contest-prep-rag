import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ChatInterface from '../components/ChatInterface'

// authFetch delegates to the (stubbed) global fetch — token attachment is
// covered in auth-fetch.test.ts.
vi.mock('../lib/authFetch', () => ({
  authFetch: (...args: Parameters<typeof fetch>) => fetch(...args),
}))

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

// ── Typing indicator ───────────────────────────────────────────────────────────

describe('Task 9 (extended): Typing indicator', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should show a three-dot typing indicator after send and before the first token arrives', async () => {
    let unblock!: () => void
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        async start(controller) {
          await new Promise<void>((r) => { unblock = r })
          controller.enqueue(encoder.encode('Hello'))
          controller.close()
        },
      }),
    }))

    render(<ChatInterface />)
    await act(async () => { await sendMessage('Question') })

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()

    await act(async () => { unblock() })

    await waitFor(() => {
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
    })
  })

  it('should not show the typing indicator when idle', () => {
    render(<ChatInterface />)
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
  })

  it('should not show the typing indicator once streaming content has arrived', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Answer text.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Question') })

    await waitFor(() => {
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
    })
  })
})

// ── Markdown rendering ─────────────────────────────────────────────────────────

describe('Task 9 (extended): Markdown rendering', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should render bold Markdown syntax as <strong> in assistant messages', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Eat **220g** of protein daily.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Protein?') })

    await waitFor(() => {
      const strong = document.querySelector('strong')
      expect(strong).toBeInTheDocument()
      expect(strong!.textContent).toBe('220g')
    })
  })

  it('should not apply Markdown rendering to user messages', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('ok'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('**bold question**') })

    await waitFor(() => {
      expect(screen.getByText('**bold question**')).toBeInTheDocument()
    })
  })
})

// ── Source citations ───────────────────────────────────────────────────────────

const SOURCES_SUFFIX = '\n\n__SOURCES__[{"source":"prep-plan.pdf"},{"source":"nutrition.docx"}]'

describe('Task 9 (extended): Source citations', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should display unique source filenames below the assistant reply', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch(`Your carb target is 250g.${SOURCES_SUFFIX}`))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Carbs?') })

    await waitFor(() => {
      expect(screen.getByText('prep-plan.pdf')).toBeInTheDocument()
      expect(screen.getByText('nutrition.docx')).toBeInTheDocument()
    })
  })

  it('should strip the __SOURCES__ suffix from the visible message text', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch(`Answer text.${SOURCES_SUFFIX}`))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Q?') })

    await waitFor(() => {
      expect(screen.queryByText(/__SOURCES__/)).not.toBeInTheDocument()
    })
  })

  it('should deduplicate filenames that appear multiple times in the suffix', async () => {
    const dupSuffix = '\n\n__SOURCES__[{"source":"prep-plan.pdf"},{"source":"prep-plan.pdf"}]'
    vi.stubGlobal('fetch', makeStreamingFetch(`Answer.${dupSuffix}`))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Q?') })

    await waitFor(() => {
      expect(screen.getAllByText('prep-plan.pdf')).toHaveLength(1)
    })
  })

  it('should not render a sources section when the stream has no __SOURCES__ suffix', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Answer with no sources.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Q?') })

    await waitFor(() => {
      expect(screen.queryByTestId('message-sources')).not.toBeInTheDocument()
    })
  })
})

// ── Quick-prompt chips ─────────────────────────────────────────────────────────

describe('Task 9 (extended): Quick-prompt chips', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should render at least one quick-prompt chip', () => {
    render(<ChatInterface />)
    expect(screen.getAllByTestId('quick-prompt-chip').length).toBeGreaterThan(0)
  })

  it('should send the chip text as a user message when a chip is clicked', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('ok'))
    render(<ChatInterface />)
    const chips = screen.getAllByTestId('quick-prompt-chip')
    const chipText = chips[0].textContent!

    await act(async () => { fireEvent.click(chips[0]) })

    await waitFor(() => {
      const userMsg = screen.getAllByRole('article').find(
        (el) => el.getAttribute('data-role') === 'user'
      )
      expect(userMsg?.textContent).toContain(chipText)
    })
  })

  it('should trigger a send when a chip is clicked', async () => {
    const fetchMock = makeStreamingFetch('Answer.')
    vi.stubGlobal('fetch', fetchMock)
    render(<ChatInterface />)

    const chips = screen.getAllByTestId('quick-prompt-chip')
    await act(async () => { fireEvent.click(chips[0]) })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  })
})

// ── Copy button ────────────────────────────────────────────────────────────────

describe('Task 9 (extended): Copy button', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should call clipboard.writeText with the message content when copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('fetch', makeStreamingFetch('Your protein target is 220g.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Protein?') })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    })

    expect(writeText).toHaveBeenCalledWith('Your protein target is 220g.')
  })
})

// ── Clear conversation ─────────────────────────────────────────────────────────

describe('Task 9 (extended): Clear conversation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should render a clear button in the chat header', () => {
    render(<ChatInterface />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('should reset the conversation to the empty state when the clear button is clicked', async () => {
    vi.stubGlobal('fetch', makeStreamingFetch('Answer.'))
    render(<ChatInterface />)

    await act(async () => { await sendMessage('Question') })
    await waitFor(() => screen.getByText('Answer.'))

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => {
      expect(screen.getByText(/ask something/i)).toBeInTheDocument()
      expect(screen.queryByText('Answer.')).not.toBeInTheDocument()
    })
  })
})
