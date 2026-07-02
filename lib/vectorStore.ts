import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { VectorStore } from "@langchain/core/vectorstores";
import { Embeddings } from "@langchain/core/embeddings";
import { type DocumentInterface } from "@langchain/core/documents";
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

  /** When set, entries are serialized here after every addDocuments call. */
  persistPath?: string;

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
    await this.persist();
  }

  private async persist(): Promise<void> {
    if (!this.persistPath) return;
    const serialized = this.entries.map(({ vector, doc }) => ({
      vector,
      pageContent: doc.pageContent,
      metadata: doc.metadata,
    }));
    await mkdir(dirname(this.persistPath), { recursive: true });
    await writeFile(this.persistPath, JSON.stringify(serialized));
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

const storeMap = new Map<string, Promise<InMemoryVectorStore>>();

const DATA_DIR = join(process.cwd(), "data", "vector-stores");

type SerializedEntry = {
  vector: number[];
  pageContent: string;
  metadata: Record<string, unknown>;
};

async function createStore(uid: string): Promise<InMemoryVectorStore> {
  const store = new InMemoryVectorStore(new HFEmbeddings(), {});
  store.persistPath = join(DATA_DIR, `${uid}.json`);
  try {
    const raw = await readFile(store.persistPath, "utf8");
    const entries = JSON.parse(raw) as SerializedEntry[];
    await store.addVectors(
      entries.map((e) => e.vector),
      entries.map((e) => ({ pageContent: e.pageContent, metadata: e.metadata }))
    );
  } catch {
    // No persisted state for this uid (or it is unreadable) — start empty.
  }
  return store;
}

export async function getVectorStore(uid: string): Promise<InMemoryVectorStore> {
  if (!storeMap.has(uid)) {
    storeMap.set(uid, createStore(uid));
  }
  return storeMap.get(uid)!;
}

export function resetVectorStore(uid?: string): void {
  if (uid === undefined) {
    storeMap.clear();
  } else {
    storeMap.delete(uid);
  }
}
