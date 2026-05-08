import { VectorStore } from "@langchain/core/vectorstores";
import { Embeddings } from "@langchain/core/embeddings";
import { Document, type DocumentInterface } from "@langchain/core/documents";
import { getEmbeddingModel } from "./embeddings";

class HFEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)));
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = await getEmbeddingModel();
    return model.embedQuery(text);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

type Entry = { vector: number[]; doc: DocumentInterface };

export class InMemoryVectorStore extends VectorStore {
  private entries: Entry[] = [];

  get size(): number {
    return this.entries.length;
  }

  _vectorstoreType(): string {
    return "in-memory";
  }

  async addVectors(
    vectors: number[][],
    documents: DocumentInterface[]
  ): Promise<void> {
    for (let i = 0; i < vectors.length; i++) {
      this.entries.push({ vector: vectors[i], doc: documents[i] });
    }
  }

  async addDocuments(documents: DocumentInterface[]): Promise<void> {
    const texts = documents.map((d) => d.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);
    await this.addVectors(vectors, documents);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number
  ): Promise<[DocumentInterface, number][]> {
    return this.entries
      .map(({ vector, doc }) => [doc, cosineSimilarity(query, vector)] as [DocumentInterface, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  }
}

let instancePromise: Promise<InMemoryVectorStore> | null = null;

export async function getVectorStore(): Promise<InMemoryVectorStore> {
  if (!instancePromise) {
    instancePromise = Promise.resolve(new InMemoryVectorStore(new HFEmbeddings(), {}));
  }
  return instancePromise;
}

export function resetVectorStore(): void {
  instancePromise = null;
}
