import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'

vi.mock('@huggingface/transformers', async () => {
  const { makeHFMock } = await import('./helpers')
  return makeHFMock()
})

vi.mock('fs/promises', async () => {
  const { makeFsMock } = await import('./helpers')
  return makeFsMock()
})

import { readFile, writeFile } from 'fs/promises'

const storePath = (uid: string) => join(process.cwd(), 'data', 'vector-stores', `${uid}.json`)

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('vector store disk persistence', () => {
  it('writes serialized entries to data/vector-stores/{uid}.json on addDocuments', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')
    const store = await getVectorStore('persist-uid')

    await store.addDocuments([
      { pageContent: 'Peak week: drop water Wednesday.', metadata: { source: 'peak.pdf' } },
    ])

    expect(writeFile).toHaveBeenCalledTimes(1)
    const [path, contents] = vi.mocked(writeFile).mock.calls[0]
    expect(path).toBe(storePath('persist-uid'))
    const parsed = JSON.parse(contents as string)
    expect(JSON.stringify(parsed)).toContain('Peak week: drop water Wednesday.')
  })

  it('restores a previously persisted store from disk on first access', async () => {
    // Round-trip: persist a store, then boot a fresh module registry (cold server)
    // and verify the same uid's store is hydrated from what was written.
    const first = await import('../lib/vectorStore')
    const store = await first.getVectorStore('cold-uid')
    await store.addDocuments([
      { pageContent: 'Refeed day: 400g carbs.', metadata: { source: 'nutrition.pdf' } },
    ])
    const written = vi.mocked(writeFile).mock.calls[0][1] as string

    vi.resetModules()
    vi.mocked(readFile).mockResolvedValueOnce(written)

    const second = await import('../lib/vectorStore')
    const revived = await second.getVectorStore('cold-uid')

    expect(readFile).toHaveBeenCalledWith(storePath('cold-uid'), 'utf8')
    expect(revived.size).toBe(1)
    const [doc] = await revived.similaritySearch('carbs refeed', 1)
    expect(doc.pageContent).toBe('Refeed day: 400g carbs.')
    expect(doc.metadata).toEqual({ source: 'nutrition.pdf' })
  })

  it('returns an empty store without error when no file exists for the uid', async () => {
    const { getVectorStore } = await import('../lib/vectorStore')

    const store = await getVectorStore('brand-new-uid')

    expect(store.size).toBe(0)
  })
})
