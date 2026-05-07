import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simulate what the RAG chain's .stream() yields: string chunks
async function* fakeChainStream(...chunks: string[]) {
  for (const chunk of chunks) yield chunk
}

async function* errorChainStream() {
  yield 'Partial output...'
  throw new Error('Chain failed mid-stream')
}

describe('Task 6: Streaming Wiring', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  // ── Headers ─────────────────────────────────────────────────────────────

  it('should define the required streaming response headers', async () => {
    const { STREAMING_HEADERS } = await import('../lib/streaming')

    expect(STREAMING_HEADERS['Content-Type']).toMatch(/text\/plain/)
    expect(STREAMING_HEADERS['Cache-Control']).toBe('no-cache')
    expect(STREAMING_HEADERS['Connection']).toBe('keep-alive')
  })

  it('should return a Response with streaming headers', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(fakeChainStream('hello'))

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toMatch(/text\/plain/)
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })

  // ── TransformStream ──────────────────────────────────────────────────────

  it('should use TransformStream to encode string chunks into Uint8Array', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(fakeChainStream('hello'))
    const reader = response.body!.getReader()

    const { value } = await reader.read()
    reader.cancel()

    // Body chunks are Uint8Array (encoded text), not raw strings
    expect(value).toBeInstanceOf(Uint8Array)
    expect(new TextDecoder().decode(value)).toBe('hello')
  })

  it('should pass all chunks through the TransformStream without dropping any', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(fakeChainStream('First', ' second', ' third'))
    const decoder = new TextDecoder()
    const reader = response.body!.getReader()
    const received: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received.push(decoder.decode(value))
    }

    expect(received).toHaveLength(3)
    expect(received.join('')).toBe('First second third')
  })

  // ── ReadableStream consumption (client side) ─────────────────────────────

  it('should allow the client to read the full streamed response', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const chunks = ['The ', 'answer ', 'is ', '42.']
    const response = chainStreamToResponse(fakeChainStream(...chunks))

    // Simulate client reading the stream
    const text = await response.text()
    expect(text).toBe('The answer is 42.')
  })

  it('should allow the client to consume chunks incrementally', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(fakeChainStream('chunk1', 'chunk2', 'chunk3'))
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const received: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received.push(decoder.decode(value))
    }

    // Each yielded string should arrive as its own read()
    expect(received).toHaveLength(3)
    expect(received[0]).toBe('chunk1')
    expect(received[1]).toBe('chunk2')
    expect(received[2]).toBe('chunk3')
  })

  it('should close the stream cleanly after all chunks are consumed', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(fakeChainStream('done'))
    const reader = response.body!.getReader()

    await reader.read() // consume the one chunk
    const { done } = await reader.read()

    expect(done).toBe(true)
  })

  // ── Error handling ───────────────────────────────────────────────────────

  it('should surface stream errors to the reader', async () => {
    const { chainStreamToResponse } = await import('../lib/streaming')

    const response = chainStreamToResponse(errorChainStream())
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const received: string[] = []

    await expect(async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        received.push(decoder.decode(value))
      }
    }).rejects.toThrow()

    // Partial output before the error should still have been received
    expect(received.join('')).toContain('Partial output')
  })

  // ── RAG chain integration ────────────────────────────────────────────────

  it('should accept the output of a RAG chain .stream() call', async () => {
    const { FakeListChatModel, FakeRetriever } = await import('@langchain/core/utils/testing')
    const { Document } = await import('@langchain/core/documents')
    const { buildRagChain } = await import('../lib/ragChain')
    const { chainStreamToResponse } = await import('../lib/streaming')

    const docs = [new Document({ pageContent: 'Protein: 220g daily.', metadata: {} })]
    const retriever = new FakeRetriever({ output: docs })
    const llm = new FakeListChatModel({ responses: ['Eat 220g of protein daily.'] })

    const chain = buildRagChain(retriever, llm)
    const chainStream = await chain.stream({ question: 'Protein target?', chat_history: '' })

    const response = chainStreamToResponse(chainStream)
    const text = await response.text()

    expect(text).toBeTruthy()
    expect(typeof text).toBe('string')
  })
})
