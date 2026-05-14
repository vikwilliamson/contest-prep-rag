# PRD: RAG-based Contest Prep Chatbot

## Problem

NPC/IFBB competitors need quick access to their personalized contest preparation protocols across multiple documents (PDFs, DOCX). Current workflow requires manually searching through scattered files to find specific information about nutrition, training, skincare, and other prep details.

## User Stories

- **As a competitor**, I want to upload my prep documents so I can query all my protocol information in one place
- **As a competitor**, I want to ask natural language questions about my prep routine and get accurate answers based on my uploaded documents
- **As a competitor**, I want to have multi-turn conversations to follow up on answers without re-uploading documents
- **As a competitor**, I want clear responses when information isn't available in my documents
- **As a competitor**, I want answers formatted with markdown so they are easy to scan
- **As a competitor**, I want to see which document an answer came from so I can verify it
- **As a competitor**, I want my uploaded documents and chat history to persist between sessions without creating an account
- **As a competitor**, I want quick-access buttons for common prep questions so I don't have to type them

## Technical Approach

- **Frontend**: Next.js App Router with React components for file upload and chat interface
- **Backend**: Next.js API routes handling file processing, document embedding, and chat logic
- **RAG Pipeline**: Langchain.js for document processing, embedding generation, and retrieval
- **Vector Storage**: Custom `InMemoryVectorStore` extending `VectorStore` from `@langchain/core/vectorstores`, persisted to disk as JSON between server restarts
- **LLM**: Anthropic Claude Sonnet 4.5 for chat completions
- **Embeddings**: `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`
- **Persistence**: JSON file on disk for vector store; Firebase (Firestore + Storage) for full cross-device persistence with anonymous auth
- **Markdown**: `react-markdown` with `remark-gfm` for rendering assistant responses

## Chunking Strategy

- **Splitter**: Sliding window character splitter
- **Chunk size**: 3200 characters
- **Chunk overlap**: 600 characters

## Retrieval Parameters

- **Top-k**: 4 documents retrieved per query
- **Source metadata**: each chunk carries `source` (filename) and `chunkIndex` so citations can be surfaced in the UI

## Vector Store Behavior

- New document uploads append to the existing in-memory store within a server session
- Store is persisted to `data/vector-store.json` on every write and restored on server startup
- Full Firebase persistence (Firestore + Storage) is a planned upgrade path

## RAG System Prompt

The system prompt encodes NPC/IFBB domain knowledge so the model gives competition-appropriate answers even when documents are sparse or ambiguous.

```
You are an expert contest preparation assistant for NPC/IFBB natural and open competitors.
You have deep knowledge of:
- Competition phases: off-season/building, contest prep cut, peak week, day-of show
- Nutrition: macro cycling, carb loading/depletion, calorie deficits, refeed days, water/sodium manipulation
- Training: periodization, volume management during prep, deload weeks, LISS/HIIT/fasted cardio
- Supplements: common contest prep stacks, timing protocols
- Posing: mandatory poses by division, presentation, transitions, stage presence
- NPC/IFBB divisions: Bikini, Figure, Physique, Bodybuilding, Classic Physique, Men's Physique, Wellness

Answer questions ONLY using the provided context from the athlete's documents.
If the information does not exist in the context, respond exactly:
"There is no info regarding that topic. Please consult with your coach."

Never provide medical advice. Always defer health and safety decisions to a licensed professional or the athlete's coach.

Context: {context}
Chat History: {chat_history}
```

## Session State Management

- Conversation history managed client-side
- Full history sent with each request as a formatted string
- No server-side session state storage (stateless API)

## UI Layout

Single-page application with two-panel layout:
- **Left panel**: Document upload (drag-and-drop), uploaded file list with type icons and chunk counts, document stats
- **Right panel**: Chat interface with markdown-rendered messages, streaming responses, typing indicator, quick-prompt chips, copy and clear controls

## Persistence Architecture

### Phase 1 — Disk Persistence (JSON)
- On every `addDocuments` call, serialize the vector store (vectors + document text + metadata) to `data/vector-store.json`
- On server startup, `getVectorStore()` loads the file if present
- Enables survival across server restarts with no new infrastructure

### Phase 2 — Firebase
- **Anonymous auth**: Firebase SDK silently creates a persistent identity on first visit; no sign-in UI required
- **Firestore**: store serialized vector data and chat history scoped to the anonymous user UID
- **Firebase Storage**: store original uploaded files so they can be re-processed if needed
- Upgrade path to real accounts (Google/email) requires only swapping the auth method

## UI Features

### Implemented
- Drag-and-drop PDF/DOCX upload
- File validation (type, size)
- Upload progress indicator
- Uploaded file list with chunk counts and remove button
- Streaming chat responses
- Multi-turn conversation history
- Fallback response when no context is found
- Dark mode

### Planned
- Markdown rendering for assistant responses (`react-markdown` + `remark-gfm`)
- Animated typing indicator before first token arrives
- Source citations on assistant messages (filename of retrieved chunks)
- Quick-prompt chips (common NPC/IFBB questions)
- Copy button on assistant messages
- Clear conversation button
- File type icons (PDF vs DOCX) in document list
- Toast notifications for upload success/failure

## Constraints

- Single-session memory by default (Phase 1 adds disk persistence, Phase 2 adds Firebase)
- Local file storage for uploads
- Demo-focused scope — no multi-user support
- Streaming responses required for chat
- No medical advice; always defer to coach
- Next.js API body size limit set to 10MB for documents

## File Lifecycle & Upload Behavior

- Users can upload multiple files one at a time
- Each upload appends to the active vector store
- Phase 1: vector store persists to disk; original files stored in `/uploads`
- Phase 2: original files uploaded to Firebase Storage; Firestore holds vector data

## Out of Scope (Current)

- User authentication UI (anonymous auth handles identity silently)
- Cross-user document sharing
- OCR for scanned/image-only PDFs
- Advanced admin features
- Production deployment optimizations
- Multi-user support

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| LLM | Anthropic Claude Sonnet 4.5 |
| Embeddings | `@huggingface/transformers` — `Xenova/all-MiniLM-L6-v2` |
| RAG | LangChain.js 1.x |
| Vector store | Custom `InMemoryVectorStore` (cosine similarity) |
| PDF parsing | `pdf-parse` v2 |
| DOCX parsing | `mammoth` |
| Markdown | `react-markdown` + `remark-gfm` |
| Persistence (P1) | JSON file on disk |
| Persistence (P2) | Firebase Firestore + Storage + Anonymous Auth |
| Styling | Tailwind CSS v4 |
| Tests | Vitest + Testing Library |
