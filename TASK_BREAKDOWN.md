# Task Breakdown: RAG-based Contest Prep Chatbot

## Task 1: Project Setup & Dependencies

**Dependencies:** None
**Acceptance Criteria:**

- Next.js 14+ project initialized with App Router
- All required dependencies installed (langchain, @huggingface/transformers, pdf-parse, mammoth, etc.)
- Basic project structure created (components, lib, app/api routes)
- Configuration for API body size limit (10MB)
- Vitest testing setup configured

**Tests:**

- Test project initializes successfully
- Test all dependencies are installable
- Test API body size limit configuration
- Test Vitest can run basic test

## Task 2: File Upload Infrastructure

**Dependencies:** Task 1
**Acceptance Criteria:**

- Upload API endpoint (`/api/upload`) accepts PDF and DOCX files
- File validation (file type, size limits)
- Local file storage in `/uploads` directory
- File status tracking (uploaded files list)
- Error handling for invalid uploads

**Tests:**

- Test upload endpoint accepts valid PDF files
- Test upload endpoint accepts valid DOCX files
- Test upload endpoint rejects invalid file types
- Test upload endpoint rejects oversized files
- Test files are saved to correct directory
- Test error responses for invalid uploads

## Task 3: Document Processing Pipeline

**Dependencies:** Task 2
**Acceptance Criteria:**

- PDF text extraction using `pdf-parse`
- DOCX text extraction using `mammoth`
- RecursiveCharacterTextSplitter configured (3200 chars, 600 overlap)
- Text chunking produces valid document segments
- Processed chunks stored with metadata

**Tests:**

- Test PDF text extraction returns expected content
- Test DOCX text extraction returns expected content
- Test text splitter creates chunks of correct size
- Test chunk overlap is properly configured
- Test chunks include required metadata

## Task 4a: Embedding Model Initialization

**Dependencies:** Task 3
**Acceptance Criteria:**

- `@huggingface/transformers` integration with `Xenova/all-MiniLM-L6-v2`
- Singleton pattern prevents re-initialization per request
- Cold start handling for first embedding generation
- Embedding generation for document chunks

**Tests:**

- Test embedding model initializes as singleton
- Test embedding generation produces valid vectors
- Test model handles cold start correctly
- Test multiple calls reuse same instance

## Task 4b: InMemoryVectorStore Setup

**Dependencies:** Task 4a
**Acceptance Criteria:**

- Custom `InMemoryVectorStore` extends `VectorStore` from `@langchain/core/vectorstores`
- Implements `addVectors` and `similaritySearchVectorWithScore` using cosine similarity
- Singleton `getVectorStore()` / `resetVectorStore()` in `lib/vectorStore.ts`
- New documents append to existing vector store
- Vector store persists during server session
- Exposes `.asRetriever()` (inherited from base class) for use in the RAG chain

**Tests:**

- Test vector store initializes as singleton
- Test document addition appends to existing store and increments `size`
- Test `similaritySearch` returns correct number of chunks with correct shape
- Test results never exceed requested k
- Test vector store persists across multiple add operations
- Test `resetVectorStore` produces a new empty instance
- Test `.asRetriever()` is available for RAG chain wiring

## Task 5: RAG Chain Construction

**Dependencies:** Task 4b
**Acceptance Criteria:**

- Retrieval chain with top-k=4 document retrieval
- RAG prompt template integration with context/chat_history placeholders
- Anthropic Claude Sonnet 4.5 integration
- Fallback response when no relevant context found
- **Sharpened:** Given a query with no matching chunks, the chain outputs the exact string: "There is no info regarding that topic. Please consult with your coach."

**Tests:**

- Test chain retrieves top-k=4 documents
- Test prompt template correctly substitutes placeholders
- Test chain generates responses with valid context
- Test chain outputs exact fallback string with empty retriever
- Test chain handles chat history correctly

## Task 6: Streaming Wiring

**Dependencies:** Task 5
**Acceptance Criteria:**

- TransformStream setup for streaming responses
- Streaming API response headers configuration
- Client-side ReadableStream consumption
- Integration with RAG chain `.stream()` method

**Tests:**

- Test TransformStream correctly processes chain output
- Test API response includes proper streaming headers
- Test client can consume ReadableStream
- Test streaming handles errors gracefully

## Task 7: Chat API Endpoint

**Dependencies:** Task 6
**Acceptance Criteria:**

- `/api/chat` endpoint accepts questions and conversation history
- Retrieves relevant documents from vector store
- Generates streaming responses using RAG chain
- Proper error handling and response formatting
- Client-side conversation history support

**Tests:**

- Test chat endpoint accepts valid request format
- Test endpoint returns streaming response
- Test endpoint properly forwards conversation history
- Test endpoint handles malformed requests
- Test endpoint error responses are properly formatted

## Task 8: Frontend UI - Upload Panel

**Dependencies:** Task 2
**Acceptance Criteria:**

- File upload component with drag-and-drop support
- File type validation (PDF, DOCX)
- Upload progress indication
- Uploaded files list with status
- Error display for failed uploads

**Tests:**

- Test drag-and-drop file upload works
- Test file type validation on client side
- Test upload progress indicator displays correctly
- Test uploaded files list updates properly
- Test error messages display for failed uploads

## Task 9: Frontend UI - Chat Interface

**Dependencies:** Task 7
**Acceptance Criteria:**

- Chat message display with user/assistant differentiation
- Message input field with send functionality
- Streaming response rendering
- Conversation history display
- Responsive two-panel layout

**Tests:**

- Test messages display with correct styling
- Test message input and send functionality
- Test streaming responses render in real-time
- Test conversation history persists in UI
- Test layout is responsive on different screen sizes

## Task 10: Integration & E2E Testing

**Dependencies:** Task 9
**Acceptance Criteria:**

- Full upload-to-chat workflow functional
- Multi-turn conversations work correctly
- Streaming responses display properly
- Fallback responses trigger when appropriate
- Error handling throughout the application

**Tests:**

- Test complete workflow: upload → query → response
- Test multi-turn conversation with context retention
- Test streaming responses display end-to-end
- Test fallback responses in realistic scenarios
- Test error handling across all components

## Task 11: Demo Polish & Documentation

**Dependencies:** Task 10
**Acceptance Criteria:**

- Clean, portfolio-ready UI styling
- README with setup instructions
- Sample prep documents for testing
- Performance optimizations for demo
- Code documentation and comments

**Tests:**

- Test UI styling is consistent and professional
- Test README instructions are accurate
- Test sample documents work with system
- Test performance meets demo requirements
- Test code documentation is comprehensive
