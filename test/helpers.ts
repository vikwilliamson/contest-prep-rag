import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Stream helpers ────────────────────────────────────────────────────────────

export async function* fakeChainStream(...chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) yield chunk
}

export async function* errorChainStream(): AsyncGenerator<string> {
  yield 'Partial output...'
  throw new Error('Chain failed mid-stream')
}

// ── Request factory ───────────────────────────────────────────────────────────

export function makeRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── HuggingFace mock factory ──────────────────────────────────────────────────
// Deterministic 384-dim embeddings seeded by input text so different inputs
// produce different (but reproducible) vectors — fast, no model download.

export function makeHFMock() {
  const mockExtractor = vi.fn(async (text: string) => {
    const seed = Array.from(text).reduce((sum, c) => sum + c.charCodeAt(0), 0)
    const data = new Float32Array(384)
    for (let i = 0; i < 384; i++) {
      data[i] = Math.sin(seed * (i + 1)) * 0.5
    }
    return { data }
  })
  return { pipeline: vi.fn().mockResolvedValue(mockExtractor) }
}
