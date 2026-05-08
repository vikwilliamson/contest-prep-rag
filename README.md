# Contest Prep RAG

A RAG-powered chatbot for NPC/IFBB competitors. Upload your prep documents (nutrition plans, training protocols, posing schedules) and ask natural-language questions against them — with streaming answers sourced directly from your files.

## Features

- **Upload PDF or DOCX** prep documents via drag-and-drop or file picker
- **Semantic search** using local `Xenova/all-MiniLM-L6-v2` embeddings (no paid embedding API)
- **Streaming chat** responses via Anthropic Claude Sonnet
- **Multi-turn conversation** — chat history is included in every request
- **Fallback response** when no relevant context exists in the uploaded documents
- Dark mode support

## Architecture

```
Upload → pdf-parse / mammoth → chunking (3200 chars, 600 overlap)
       → HuggingFace embeddings → InMemoryVectorStore

Chat   → embed query → cosine similarity retrieval (top-4)
       → Claude Sonnet prompt (context + chat_history) → streaming response
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| LLM | Anthropic Claude Sonnet (`claude-sonnet-4-5`) |
| Embeddings | `@huggingface/transformers` — `Xenova/all-MiniLM-L6-v2` |
| RAG | LangChain.js 1.x |
| Vector store | Custom `InMemoryVectorStore` (cosine similarity) |
| PDF parsing | `pdf-parse` v2 |
| DOCX parsing | `mammoth` |
| Styling | Tailwind CSS v4 |
| Tests | Vitest + Testing Library (112 tests) |

## Prerequisites

- Node.js 20+
- An Anthropic API key

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY

# 3. Create the uploads directory
mkdir -p uploads

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Your Anthropic API key. |

## Running Tests

```bash
# All tests (unit + integration)
npx vitest run

# Watch mode during development
npx vitest

# Single test file
npx vitest run test/task8.test.tsx
```

> **Note:** Integration tests in `test/task10.test.ts` hit the real Anthropic API and the HuggingFace model (downloaded on first run, ~90MB). They are marked with generous timeouts; expect the first run to take 2–3 minutes.

## Usage

1. **Upload documents** — drag a PDF or DOCX onto the left panel, or click to browse. Each file is chunked, embedded, and stored in the in-memory vector store. The chunk count is shown after processing.
2. **Ask questions** — type in the chat panel and press Enter or click Send. Responses stream token by token.
3. **Follow-up** — conversation history is automatically included in each request.

The vector store is in-memory and resets on server restart. Re-upload documents after restarting the dev server.

## Sample Questions

After uploading a prep document, try:

- "What are my macros on training days?"
- "Describe my cardio protocol for the final 4 weeks."
- "What is my peak week water strategy?"
- "How many times per week do I train legs?"
