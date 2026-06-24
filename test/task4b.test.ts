import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@huggingface/transformers', async () => {
  const { makeHFMock } = await import('./helpers')
  return makeHFMock()
})

describe('Task 4b: InMemoryVectorStore Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should initialize vector store as singleton per uid', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')

    const store1 = await getVectorStore('test-uid')
    const store2 = await getVectorStore('test-uid')

    expect(store1).toBeDefined()
    expect(store1).toBe(store2)
  })

  it('should add documents and reflect new count', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')
    const store = await getVectorStore('test-uid')

    await store.addDocuments([
      { pageContent: 'Contest prep nutrition protocol for cutting phase.', metadata: { source: 'nutrition.pdf' } },
      { pageContent: 'Training protocol: 5 days per week resistance training.', metadata: { source: 'training.pdf' } },
    ])

    expect(store.size).toBe(2)
  })

  it('should retrieve top-k documents by similarity', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')
    const store = await getVectorStore('test-uid')

    await store.addDocuments([
      { pageContent: 'Carbohydrate intake: 200g on training days.', metadata: { source: 'nutrition.pdf' } },
      { pageContent: 'Protein intake: 220g daily throughout prep.', metadata: { source: 'nutrition.pdf' } },
      { pageContent: 'Cardio: 45 minutes fasted in the morning.', metadata: { source: 'training.pdf' } },
      { pageContent: 'Resistance training: compound lifts twice per week.', metadata: { source: 'training.pdf' } },
    ])

    const results = await store.similaritySearch('carbohydrate nutrition', 2)

    expect(results.length).toBe(2)
    results.forEach((doc) => {
      expect(doc).toHaveProperty('pageContent')
      expect(doc).toHaveProperty('metadata')
      expect(typeof doc.pageContent).toBe('string')
    })
  })

  it('should never return more than k results', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')
    const store = await getVectorStore('test-uid')

    await store.addDocuments([
      { pageContent: 'Document one about prep nutrition.', metadata: {} },
      { pageContent: 'Document two about contest training.', metadata: {} },
      { pageContent: 'Document three about peak week protocol.', metadata: {} },
      { pageContent: 'Document four about posing practice.', metadata: {} },
      { pageContent: 'Document five about supplement timing.', metadata: {} },
    ])

    const results = await store.similaritySearch('nutrition prep', 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('should accumulate documents across multiple add calls on the same instance', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')

    const store = await getVectorStore('test-uid')
    await store.addDocuments([
      { pageContent: 'Week 1 check-in: weight 185lbs.', metadata: { source: 'log.pdf' } },
    ])

    const sameStore = await getVectorStore('test-uid')
    await sameStore.addDocuments([
      { pageContent: 'Week 2 check-in: weight 182lbs.', metadata: { source: 'log.pdf' } },
    ])

    expect(sameStore).toBe(store)
    expect(store.size).toBe(2)
  })

  it('should expose asRetriever() for RAG chain wiring', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')
    const store = await getVectorStore('test-uid')

    const retriever = store.asRetriever(4)

    expect(retriever).toBeDefined()
    expect(typeof retriever.invoke).toBe('function')
  })

  it('should reset to a fresh empty store', async () => {
    const { getVectorStore, resetVectorStore } = await import('../lib/vectorStore')

    const store1 = await getVectorStore('test-uid')
    await store1.addDocuments([
      { pageContent: 'Existing document before reset.', metadata: {} },
    ])
    expect(store1.size).toBe(1)

    resetVectorStore('test-uid')

    const store2 = await getVectorStore('test-uid')
    expect(store2).not.toBe(store1)
    expect(store2.size).toBe(0)
  })
})
