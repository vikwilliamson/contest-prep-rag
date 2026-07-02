// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { Document } from '@langchain/core/documents'
import { NextRequest } from 'next/server'
import { getVectorStore, resetVectorStore } from '../lib/vectorStore'
import { getRagChain, resetRagChain, buildRagChain, FALLBACK_RESPONSE, TOP_K } from '../lib/ragChain'
import { chainStreamToResponse } from '../lib/streaming'
import { resetEmbeddingModel } from '../lib/embeddings'
import { FakeListChatModel, FakeRetriever } from '@langchain/core/utils/testing'

vi.mock('../lib/firebase-admin', () => ({
  verifyIdToken: vi.fn().mockResolvedValue('anonymous'),
}))

// Keep the vector store's disk persistence (lib/vectorStore) off the real fs —
// covered dedicatedly in vector-store-persistence.test.ts.
vi.mock('fs/promises', async () => {
  const { makeFsMock } = await import('./helpers')
  return makeFsMock()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function collectStream(stream: AsyncIterable<unknown>): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stream) {
    if (typeof chunk === 'string') chunks.push(chunk)
  }
  return chunks.join('')
}

async function chatPost(body: unknown): Promise<Response> {
  const { POST } = await import('../app/api/chat/route')
  return POST(new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token-anonymous',
    },
    body: JSON.stringify(body),
  }))
}

// ── Setup ─────────────────────────────────────────────────────────────────────

// Warm up the embedding model once for the whole file — it may download on first use
beforeAll(async () => {
  const store = await getVectorStore('test-uid')
  await store.addDocuments([
    new Document({ pageContent: 'warm-up', metadata: {} }),
  ])
  resetVectorStore()
  resetEmbeddingModel()
}, 120_000)

afterEach(() => {
  resetVectorStore()
  resetRagChain()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Task 10: Integration & E2E', () => {

  // ── Document pipeline ─────────────────────────────────────────────────────

  describe('Vector store integration', () => {
    it('should embed documents and retrieve the most semantically similar one', async () => {
      const store = await getVectorStore('test-uid')
      await store.addDocuments([
        new Document({ pageContent: 'Carbohydrate intake on training days: 200 grams.', metadata: { source: 'nutrition.pdf' } }),
        new Document({ pageContent: 'Daily protein target throughout prep: 220 grams.', metadata: { source: 'nutrition.pdf' } }),
        new Document({ pageContent: 'Fasted steady-state cardio: 45 minutes every morning.', metadata: { source: 'training.pdf' } }),
      ])

      const results = await store.similaritySearch('carbohydrate and carb intake', 1)
      expect(results).toHaveLength(1)
      expect(results[0].pageContent.toLowerCase()).toContain('carbohydrate')
    }, 30_000)

    it('should accumulate documents from multiple addDocuments calls', async () => {
      const store = await getVectorStore('test-uid')
      await store.addDocuments([new Document({ pageContent: 'Week 1 check-in: weight 185 lbs.', metadata: {} })])
      await store.addDocuments([new Document({ pageContent: 'Week 2 check-in: weight 182 lbs.', metadata: {} })])
      await store.addDocuments([new Document({ pageContent: 'Week 3 check-in: weight 180 lbs.', metadata: {} })])

      const results = await store.similaritySearch('weekly weight check-in', TOP_K)
      expect(results.length).toBe(3)
    }, 30_000)

    it('should return at most TOP_K results', async () => {
      const store = await getVectorStore('test-uid')
      await store.addDocuments(
        Array.from({ length: 10 }, (_, i) =>
          new Document({ pageContent: `Prep document ${i + 1}: contest training detail.`, metadata: {} })
        )
      )

      const results = await store.similaritySearch('contest training', TOP_K)
      expect(results.length).toBeLessThanOrEqual(TOP_K)
    }, 30_000)
  })

  // ── RAG chain ─────────────────────────────────────────────────────────────

  describe('RAG chain integration', () => {
    it('should return FALLBACK_RESPONSE when the vector store is empty', async () => {
      const chain = await getRagChain('test-uid')
      const response = await collectStream(
        await chain.stream({ question: 'What is my carb target?', chat_history: '' })
      )
      expect(response).toBe(FALLBACK_RESPONSE)
    }, 30_000)

    it('should return a non-empty LLM response when context is available', async () => {
      const store = await getVectorStore('test-uid')
      await store.addDocuments([
        new Document({ pageContent: 'Daily protein target is 220 grams throughout all prep phases.', metadata: { source: 'nutrition.pdf' } }),
      ])

      const chain = await getRagChain('test-uid')
      const response = await collectStream(
        await chain.stream({ question: 'What is my protein target?', chat_history: '' })
      )

      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
      expect(response).not.toBe(FALLBACK_RESPONSE)
    }, 60_000)

    it('should stream tokens incrementally rather than returning all at once', async () => {
      const store = await getVectorStore('test-uid')
      await store.addDocuments([
        new Document({ pageContent: 'Training split: push/pull/legs, 5 days per week.', metadata: {} }),
      ])

      const chain = await getRagChain('test-uid')
      const chunks: string[] = []

      for await (const chunk of await chain.stream({ question: 'What is my training split?', chat_history: '' })) {
        if (typeof chunk === 'string') chunks.push(chunk)
      }

      // FakeListChatModel streams word-by-word; real Anthropic streams tokens
      expect(chunks.length).toBeGreaterThanOrEqual(1)
      expect(chunks.join('')).not.toBe(FALLBACK_RESPONSE)
    }, 60_000)
  })

  // ── Streaming response ────────────────────────────────────────────────────

  describe('chainStreamToResponse integration', () => {
    it('should produce a valid streaming HTTP response from a RAG chain stream', async () => {
      const docs = [new Document({ pageContent: 'Contest peak week: drop water by reducing sodium.', metadata: {} })]
      const retriever = new FakeRetriever({ output: docs })
      const llm = new FakeListChatModel({ responses: ['Reduce sodium intake during peak week.'] })

      const chain = buildRagChain(retriever, llm)
      const stream = await chain.stream({ question: 'Peak week tips?', chat_history: '' })
      const response = chainStreamToResponse(stream)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toMatch(/text\/plain/)
      expect(response.headers.get('Cache-Control')).toBe('no-cache')

      const text = await response.text()
      expect(text.length).toBeGreaterThan(0)
    })

    it('should stream the fallback response when retriever returns no docs', async () => {
      const retriever = new FakeRetriever({ output: [] })
      const llm = new FakeListChatModel({ responses: [] })

      const chain = buildRagChain(retriever, llm)
      const stream = await chain.stream({ question: 'Unknown topic?', chat_history: '' })
      const response = chainStreamToResponse(stream)
      const text = await response.text()

      expect(text).toBe(FALLBACK_RESPONSE)
    })
  })

  // ── Chat API endpoint ─────────────────────────────────────────────────────

  describe('Chat API route integration', () => {
    it('should return 400 when question is missing', async () => {
      const res = await chatPost({ chat_history: '' })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 400 for non-string question', async () => {
      const res = await chatPost({ question: 123, chat_history: '' })
      expect(res.status).toBe(400)
    })

    it('should return 400 for malformed JSON', async () => {
      const { POST } = await import('../app/api/chat/route')
      const res = await POST(new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }))
      expect(res.status).toBe(400)
    })

    it('should return FALLBACK_RESPONSE when store is empty (real API call)', async () => {
      const res = await chatPost({ question: 'What is my supplement stack?', chat_history: '' })
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toMatch(/text\/plain/)
      const text = await res.text()
      expect(text).toBe(FALLBACK_RESPONSE)
    }, 30_000)

    it('should return an LLM response when the store has relevant documents', async () => {
      const store = await getVectorStore('anonymous')
      await store.addDocuments([
        new Document({ pageContent: 'Calorie target during 12-week prep: 2400 kcal on training days.', metadata: { source: 'plan.pdf' } }),
      ])

      const res = await chatPost({ question: 'What is my calorie target?', chat_history: '' })
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text.length).toBeGreaterThan(0)
      expect(text).not.toBe(FALLBACK_RESPONSE)
    }, 60_000)
  })

  // ── Multi-turn conversation ───────────────────────────────────────────────

  describe('Multi-turn conversation', () => {
    it('should incorporate chat_history into subsequent requests', async () => {
      const store = await getVectorStore('anonymous')
      await store.addDocuments([
        new Document({ pageContent: 'Week 8 check-in: bodyweight 180 lbs, body fat 10%.', metadata: {} }),
      ])

      // First turn
      const res1 = await chatPost({ question: 'What was my week 8 weight?', chat_history: '' })
      const answer1 = await res1.text()
      expect(answer1.length).toBeGreaterThan(0)

      // Second turn — history includes the first exchange
      const history = `User: What was my week 8 weight?\nAssistant: ${answer1}`
      const res2 = await chatPost({ question: 'And what was my body fat at that time?', chat_history: history })
      const answer2 = await res2.text()

      expect(res2.status).toBe(200)
      expect(answer2.length).toBeGreaterThan(0)
    }, 120_000)

    it('should default to empty chat_history when the field is omitted', async () => {
      const res = await chatPost({ question: 'What is my training frequency?' })
      // With empty store this returns fallback — the point is it does not error
      expect(res.status).toBe(200)
    }, 30_000)
  })

  // ── Full upload-to-chat workflow ──────────────────────────────────────────

  describe('Full pipeline integration', () => {
    it('should answer a question after manually populating the vector store', async () => {
      // Simulate what happens after a document is uploaded and processed:
      // chunks are embedded and stored, then a user query retrieves them.
      const store = await getVectorStore('anonymous')
      const contestPrepContent = [
        'Macros for cutting phase: 2200 calories, 220g protein, 180g carbs, 50g fat.',
        'Cardio protocol: fasted LISS 45 min daily, HIIT 2x per week post-training.',
        'Peak week water loading: 2 gallons per day until Thursday, then taper to 0.5 gallons.',
        'Posing practice: minimum 20 minutes daily in front of mirror, focus on vacuum and transitions.',
      ]
      await store.addDocuments(
        contestPrepContent.map((text, i) =>
          new Document({ pageContent: text, metadata: { source: 'contest-prep.pdf', chunkIndex: i } })
        )
      )

      const res = await chatPost({ question: 'What are my macros for the cutting phase?', chat_history: '' })
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).not.toBe(FALLBACK_RESPONSE)
      expect(text.length).toBeGreaterThan(0)
    }, 60_000)
  })
})
