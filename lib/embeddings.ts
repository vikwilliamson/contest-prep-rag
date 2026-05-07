import { pipeline } from '@huggingface/transformers'

type EmbeddingModel = {
  embedQuery(text: string): Promise<number[]>
}

// Store a promise rather than the resolved value to handle concurrent calls safely
let instancePromise: Promise<EmbeddingModel> | null = null

async function createModel(): Promise<EmbeddingModel> {
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'fp32',
  })

  return {
    async embedQuery(text: string): Promise<number[]> {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    },
  }
}

export async function getEmbeddingModel(): Promise<EmbeddingModel> {
  if (!instancePromise) {
    instancePromise = createModel()
  }
  return instancePromise
}

export function resetEmbeddingModel(): void {
  instancePromise = null
}
