import { readFile } from "fs/promises";
import { basename } from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface DocumentChunk {
  pageContent: string;
  metadata: {
    source: string;
    chunkIndex: number;
    timestamp: string;
  };
}

const CHUNK_SIZE = 3200;
const CHUNK_OVERLAP = 600;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

export async function processDocument(
  filePath: string,
  mimeType: string
): Promise<DocumentChunk[]> {
  const buffer = await readFile(filePath);
  const text = await extractText(buffer, mimeType);
  const source = basename(filePath);
  const timestamp = new Date().toISOString();

  return splitIntoChunks(text).map((pageContent, chunkIndex) => ({
    pageContent,
    metadata: { source, chunkIndex, timestamp },
  }));
}
