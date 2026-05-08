import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeChainStream, makeRequest } from './helpers'

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('../lib/ragChain', () => ({
  getRagChain: vi.fn(),
}))

vi.mock('../lib/streaming', () => ({
  chainStreamToResponse: vi.fn(),
  STREAMING_HEADERS: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
}))

import { getRagChain } from '../lib/ragChain'
import { chainStreamToResponse } from '../lib/streaming'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStreamingResponse(): Response {
  return new Response('streamed', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Task 7: Chat API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default happy-path mock setup
    const mockChain = { stream: vi.fn().mockResolvedValue(fakeChainStream('response')) }
    vi.mocked(getRagChain).mockResolvedValue(mockChain as never)
    vi.mocked(chainStreamToResponse).mockReturnValue(makeStreamingResponse())
  })

  // ── Valid requests ─────────────────────────────────────────────────────────

  it('should return a streaming response for a valid request', async () => {
    const { POST } = await import('../app/api/chat/route')

    const req = makeRequest({ question: 'What is my protein target?', chat_history: '' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/text\/plain/)
    expect(chainStreamToResponse).toHaveBeenCalledOnce()
  })

  it('should forward question and chat_history to the RAG chain', async () => {
    const { POST } = await import('../app/api/chat/route')

    const mockStream = vi.fn().mockResolvedValue(fakeChainStream('ok'))
    vi.mocked(getRagChain).mockResolvedValue({ stream: mockStream } as never)

    const req = makeRequest({
      question: 'How many carbs on rest days?',
      chat_history: 'User: What is my calorie target? Assistant: 2400 calories.',
    })
    await POST(req)

    expect(mockStream).toHaveBeenCalledWith({
      question: 'How many carbs on rest days?',
      chat_history: 'User: What is my calorie target? Assistant: 2400 calories.',
    })
  })

  it('should default chat_history to an empty string when omitted', async () => {
    const { POST } = await import('../app/api/chat/route')

    const mockStream = vi.fn().mockResolvedValue(fakeChainStream('ok'))
    vi.mocked(getRagChain).mockResolvedValue({ stream: mockStream } as never)

    const req = makeRequest({ question: 'What is my training split?' })
    await POST(req)

    expect(mockStream).toHaveBeenCalledWith({
      question: 'What is my training split?',
      chat_history: '',
    })
  })

  it('should pass the chain stream directly to chainStreamToResponse', async () => {
    const { POST } = await import('../app/api/chat/route')

    const stream = fakeChainStream('chunk1', 'chunk2')
    const mockStream = vi.fn().mockResolvedValue(stream)
    vi.mocked(getRagChain).mockResolvedValue({ stream: mockStream } as never)

    const req = makeRequest({ question: 'Test?', chat_history: '' })
    await POST(req)

    expect(chainStreamToResponse).toHaveBeenCalledWith(stream)
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('should return 400 when question is missing', async () => {
    const { POST } = await import('../app/api/chat/route')

    const req = makeRequest({ chat_history: '' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('should return 400 when question is not a string', async () => {
    const { POST } = await import('../app/api/chat/route')

    const req = makeRequest({ question: 42, chat_history: '' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('should return 400 when the request body is not valid JSON', async () => {
    const { POST } = await import('../app/api/chat/route')

    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json at all',
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it('should return 500 when getRagChain throws', async () => {
    const { POST } = await import('../app/api/chat/route')

    vi.mocked(getRagChain).mockRejectedValue(new Error('Model init failed'))

    const req = makeRequest({ question: 'Test?', chat_history: '' })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('should return 500 when chain.stream throws', async () => {
    const { POST } = await import('../app/api/chat/route')

    const mockStream = vi.fn().mockRejectedValue(new Error('Stream error'))
    vi.mocked(getRagChain).mockResolvedValue({ stream: mockStream } as never)

    const req = makeRequest({ question: 'Test?', chat_history: '' })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
