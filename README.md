# Contest Prep Platform

A full-stack platform for NPC/IFBB competitors — RAG-powered chat against your prep documents, plus a nutrition journal for daily meal tracking.

## Features

### RAG Chat
- **Upload PDF or DOCX** prep documents via drag-and-drop or file picker
- **Semantic search** using local `Xenova/all-MiniLM-L6-v2` embeddings (no paid embedding API)
- **Streaming chat** responses via Anthropic Claude Sonnet
- **Multi-turn conversation** with chat history included in every request
- **Source citations** — each answer shows which document(s) it came from
- **Fallback response** when no relevant context exists in uploaded documents
- **Quick-prompt chips** for common NPC/IFBB questions
- Markdown rendering, typing indicator, copy and clear controls

### Nutrition Journal _(planned)_
- **Meal logging** — search USDA FoodData Central and Open Food Facts to log foods across Breakfast, Lunch, Dinner, and Snacks
- **Macro tracking** — daily calorie, protein, carbs, and fat targets (in grams) with read-only percentage display
- **Micronutrient tracking** — fiber, sodium, potassium, sugar, cholesterol, calcium, iron
- **Saved meals** — create named meal combinations (e.g. "Breakky") and add them to any day's log in one tap
- **Day navigation** — today-first with back/forward arrows and calendar picker

## Architecture

```
Auth       → Firebase Google Sign-In → UID-scoped data access

RAG Chat   → Upload → pdf-parse / mammoth → chunking (3200 chars, 600 overlap)
                    → HuggingFace embeddings → InMemoryVectorStore (per user)
           → Chat → embed query → cosine similarity retrieval (top-4)
                  → Claude Sonnet prompt (context + chat_history) → streaming response

Journal    → Food search → USDA + Open Food Facts (parallel, server-proxied)
                        → Immutable snapshot stored to Firestore
           → Goals / logs / saved meals → Firestore (users/{uid}/...)
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| LLM | Anthropic Claude Sonnet |
| Embeddings | `@huggingface/transformers` — `Xenova/all-MiniLM-L6-v2` |
| RAG | LangChain.js 1.x |
| Vector store | Custom `InMemoryVectorStore` (cosine similarity) |
| PDF parsing | `pdf-parse` v2 |
| DOCX parsing | `mammoth` |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firebase Firestore |
| Food APIs | USDA FoodData Central + Open Food Facts |
| Markdown | `react-markdown` + `remark-gfm` |
| Styling | Tailwind CSS v4 |
| Tests | Vitest + Testing Library |

## Prerequisites

- Node.js 20+
- An Anthropic API key
- A Firebase project (for auth + Firestore)
- A USDA FoodData Central API key (free — register at api.nal.usda.gov)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local — see Environment Variables below

# 3. Create the uploads and data directories
mkdir -p uploads data/vector-stores

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Your Anthropic API key. |
| `FIREBASE_PROJECT_ID` | Required. Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Required. Firebase Admin SDK service account email. |
| `FIREBASE_PRIVATE_KEY` | Required. Firebase Admin SDK private key. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Required. Firebase client config (safe to be public). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Required. Firebase client config. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Required. Firebase client config. |
| `USDA_API_KEY` | Required for journal food search. USDA FoodData Central key. |

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

### RAG Chat

1. **Sign in** with your Google account.
2. **Upload documents** — drag a PDF or DOCX onto the left panel, or click to browse. Each file is chunked, embedded, and stored in your personal vector store.
3. **Ask questions** — type in the chat panel and press Enter. Responses stream token by token with source citations below each answer.
4. **Follow-up** — conversation history is automatically included in each request.

### Sample Questions

After uploading a prep document, try:

- "What are my macros on training days?"
- "Describe my cardio protocol for the final 4 weeks."
- "What is my peak week water strategy?"
- "How many times per week do I train legs?"
