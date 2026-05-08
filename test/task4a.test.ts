import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@huggingface/transformers', async () => {
  const { makeHFMock } = await import('./helpers')
  return makeHFMock()
})

describe('Task 4a: Embedding Model Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()   // reset call counts without losing mock implementations
    vi.resetModules()    // fresh module state so singleton doesn't leak between cases
  })

  it('should initialize embedding model as singleton', async () => {
    const { getEmbeddingModel } = await import('../lib/embeddings')

    const model1 = await getEmbeddingModel()
    expect(model1).toBeDefined()

    const model2 = await getEmbeddingModel()
    expect(model1).toBe(model2)
  })

  it('should generate valid embeddings for text chunks', async () => {
    const { getEmbeddingModel } = await import('../lib/embeddings')
    const model = await getEmbeddingModel()

    const testText = 'This is a test document chunk for embedding generation.'
    const embedding = await model.embedQuery(testText)

    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBe(384)
    embedding.forEach((value: number) => {
      expect(typeof value).toBe('number')
      expect(!isNaN(value)).toBe(true)
    })
  })

  it('should handle cold start correctly', async () => {
    const { resetEmbeddingModel, getEmbeddingModel } = await import('../lib/embeddings')

    resetEmbeddingModel()

    const model = await getEmbeddingModel()
    expect(model).toBeDefined()

    const embedding = await model.embedQuery('Cold start test')
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBe(384)
  })

  it('should reuse same instance across multiple calls', async () => {
    const { getEmbeddingModel } = await import('../lib/embeddings')

    const instances = await Promise.all([
      getEmbeddingModel(),
      getEmbeddingModel(),
      getEmbeddingModel(),
    ])

    instances.forEach((instance) => {
      expect(instance).toBe(instances[0])
    })
  })

  it('should use Xenova/all-MiniLM-L6-v2 model', async () => {
    const { pipeline } = await import('@huggingface/transformers')
    const { getEmbeddingModel } = await import('../lib/embeddings')

    await getEmbeddingModel()

    expect(pipeline).toHaveBeenCalledOnce()
    expect(pipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      expect.objectContaining({ dtype: 'fp32' })
    )
  })

  it('should handle embedding generation for multiple chunks', async () => {
    const { getEmbeddingModel } = await import('../lib/embeddings')
    const model = await getEmbeddingModel()

    const testChunks = [
      'First document chunk about nutrition and diet.',
      'Second chunk covering training protocols and exercises.',
      'Third chunk discussing competition preparation and timeline.',
    ]

    const embeddings = await Promise.all(testChunks.map((chunk) => model.embedQuery(chunk)))

    embeddings.forEach((embedding) => {
      expect(Array.isArray(embedding)).toBe(true)
      expect(embedding.length).toBe(384)
      expect(embedding.every((val: number) => !isNaN(val))).toBe(true)
    })

    // Different content should produce different embeddings

    expect(embeddings[0]).not.toEqual(embeddings[1])
    expect(embeddings[1]).not.toEqual(embeddings[2])
    expect(embeddings[0]).not.toEqual(embeddings[2])
  })
})
