# PRD: RAG-based Contest Prep Chatbot

## Problem

NPC/IFBB competitors need quick access to their personalized contest preparation protocols across multiple documents (PDFs, DOCX). Current workflow requires manually searching through scattered files to find specific information about nutrition, training, skincare, and other prep details.

## User Stories

- **As a competitor**, I want to upload my prep documents so I can query all my protocol information in one place
- **As a competitor**, I want to ask natural language questions about my prep routine and get accurate answers based on my uploaded documents
- **As a competitor**, I want to have multi-turn conversations to follow up on answers without re-uploading documents
- **As a competitor**, I want clear responses when information isn't available in my documents

## Technical Approach

- **Frontend**: Next.js App Router with React components for file upload and chat interface
- **Backend**: Next.js API routes handling file processing, document embedding, and chat logic
- **RAG Pipeline**: Langchain.js for document processing, embedding generation, and retrieval
- **Vector Storage**: Custom `InMemoryVectorStore` extending `VectorStore` from `@langchain/core/vectorstores`
- **LLM**: Anthropic Claude Sonnet 4.5 for chat completions
- **Embeddings**: `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`

## Chunking Strategy

- **Splitter**: RecursiveCharacterTextSplitter
- **Chunk size**: 3200 characters
- **Chunk overlap**: 600 characters

## Retrieval Parameters

- **Top-k**: 4 documents retrieved per query

## Vector Store Behavior

- New document uploads append to existing in-memory store within server session
- Accumulated context persists until server restart

## RAG Prompt Template

```
System: You are a contest preparation assistant. Answer questions ONLY using the provided context. If the information doesn't exist in the context, respond exactly: "There is no info regarding that topic. Please consult with your coach."

Context: {context}
Chat History: {chat_history}
Question: {question}

Answer based on the context above:
```

## Session State Management

- Conversation history managed client-side
- Full history sent with each request
- No server-side session state storage

## UI Layout

- Single-page application
- Two-panel layout:
  - Left panel: Document upload interface and file status
  - Right panel: Chat interface with streaming responses

## Constraints

- Single-session memory (no cross-session persistence)
- Local file storage only
- Demo-focused scope (minimal viable features)
- Portfolio-ready clean implementation
- No user authentication required
- Streaming responses required for chat
- Next.js API body size limit increased to 10MB for larger documents

## File Lifecycle & Upload Behavior

- Users can upload multiple files one at a time
- Each upload appends to the active vector store
- Uploaded files persist only until server restart
- No cleanup logic required for demo

## Out of Scope

- User accounts/authentication
- Cross-session conversation history
- Document sharing between users
- Advanced admin features
- Production deployment optimizations
- Multi-user support

## Recommended Tech Additions

- **Embeddings**: `@huggingface/transformers` with `Xenova/all-MiniLM-L6-v2` model
- **Vector Store**: Custom `InMemoryVectorStore` extending `VectorStore` from `@langchain/core/vectorstores` — `MemoryVectorStore` does not exist in the JS `@langchain/core` 1.x ecosystem (only in Python). The custom class implements the two required abstract methods (`addVectors`, `similaritySearchVectorWithScore`) using cosine similarity, and inherits `.addDocuments()`, `.similaritySearch()`, and `.asRetriever()` from the base class.
- **File Processing**: `pdf-parse` for PDFs, `mammoth` for DOCX files
- **Streaming**: Langchain.js `.stream()` method on RAG chain

Tradeoffs: Local embeddings are slower than paid APIs but eliminate costs. The custom `InMemoryVectorStore` resets on server restart but is ideal for demo simplicity.
