# PRD: Contest Prep Platform

## Problem

NPC/IFBB competitors need two things in one place: (1) quick access to their personalized contest prep protocols across multiple documents, and (2) a daily nutrition journal to track meals, macros, and micronutrients against their coach-prescribed targets.

---

## Feature 1: RAG Chat

### User Stories

- **As a competitor**, I want to upload my prep documents so I can query all my protocol information in one place
- **As a competitor**, I want to ask natural language questions about my prep routine and get accurate answers based on my uploaded documents
- **As a competitor**, I want to have multi-turn conversations to follow up on answers without re-uploading documents
- **As a competitor**, I want clear responses when information isn't available in my documents
- **As a competitor**, I want answers formatted with markdown so they are easy to scan
- **As a competitor**, I want to see which document an answer came from so I can verify it
- **As a competitor**, I want my uploaded documents and chat history to persist between sessions
- **As a competitor**, I want quick-access buttons for common prep questions so I don't have to type them

### Technical Approach

- **Frontend**: Next.js App Router with React components for file upload and chat interface
- **Backend**: Next.js API routes handling file processing, document embedding, and chat logic
- **RAG Pipeline**: LangChain.js for document processing, embedding generation, and retrieval
- **Vector Storage**: Custom `InMemoryVectorStore` extending `VectorStore` from `@langchain/core/vectorstores`, persisted per user
- **LLM**: Anthropic Claude Sonnet for chat completions
- **Embeddings**: `Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`
- **Markdown**: `react-markdown` with `remark-gfm` for rendering assistant responses

### Chunking Strategy

- **Splitter**: Sliding window character splitter
- **Chunk size**: 3200 characters
- **Chunk overlap**: 600 characters

### Retrieval Parameters

- **Top-k**: 4 documents retrieved per query
- **Source metadata**: each chunk carries `source` (filename) and `chunkIndex` so citations can be surfaced in the UI

### Per-User Vector Store

The vector store is keyed by authenticated UID. On disk: `data/vector-stores/{uid}.json`. This migrates to Firestore in Phase 2. Firebase Admin SDK on every API route verifies the auth token and extracts the UID before any data access — no cross-user document bleed.

### RAG System Prompt

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

### Source Citation Stream Protocol

The `/api/chat` streaming response appends a special sentinel after the final text token:

```
\n\n__SOURCES__[{"source":"prep-plan.pdf"},{"source":"nutrition.docx"}]
```

- The sentinel is always on its own line, separated from the text by `\n\n`.
- The JSON value is an array of `{ source: string }` objects — one per retrieved chunk (may contain duplicates; the client deduplicates by filename).
- If the vector store is empty and the fallback response fires, `__SOURCES__` is omitted.
- The client strips the sentinel before rendering and stores the deduplicated filenames as `sources` on the message.

### RAG–Journal Integration (Phase 3)

The RAG chat and nutrition journal are isolated at launch. Phase 3 connects them: today's log summary is injected into the RAG context, enabling queries like "based on my prep plan and what I've eaten today, what should I have for dinner?" This is a clearly documented extension point, not retrofitted coupling.

### Implemented UI Features

- Drag-and-drop PDF/DOCX upload
- File validation (type, size)
- Upload progress indicator
- Uploaded file list with chunk counts, file type icons, and remove button
- Streaming chat responses
- Multi-turn conversation history
- Fallback response when no context is found
- Dark mode
- Markdown rendering for assistant responses
- Animated three-dot typing indicator before first token arrives
- Source citations below each assistant reply
- Quick-prompt chips for common NPC/IFBB questions
- Copy button on assistant messages
- Clear conversation button
- Toast notifications for upload success/failure

---

## Feature 2: Nutrition Journal

### User Stories

- **As a competitor**, I want to log foods I ate for each meal (breakfast, lunch, dinner, snacks) by searching a food database
- **As a competitor**, I want to set daily calorie and macro targets (in grams) and see my progress against them
- **As a competitor**, I want to track key micronutrients relevant to contest prep (fiber, sodium, potassium, sugar, cholesterol, calcium, iron)
- **As a competitor**, I want to save common meal combinations and add them to my log in one tap
- **As a competitor**, I want to review past days and navigate my log history

### Food Data

**APIs (parallel fan-out on every search, USDA results sorted first):**
- **USDA FoodData Central** — primary source; comprehensive micronutrient data; free with API key registration; no rate limits
- **Open Food Facts** — secondary source; fills in branded/packaged foods USDA lacks; fully open, no key required

All search calls are proxied through a Next.js API route — API keys are never exposed client-side.

**Nutrients tracked:** calories, protein, carbs, fat, fiber, sodium, potassium, sugar, cholesterol, calcium, iron

### Log Entry Snapshot Schema

Log entries are immutable snapshots — nutritional data is copied at log time from API results and never re-fetched. The entry is self-contained.

```ts
{
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snacks',
  foodName: string,
  servingDescription: string,  // e.g. "1.5 cups (360g)"
  grams: number,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  sodium: number,
  potassium: number,
  sugar: number,
  cholesterol: number,
  calcium: number,
  iron: number
}
```

### Firestore Data Model

```
users/{uid}/
  goals                           ← single document (calorie + macro + micro targets)
  logs/{date}/
    entries/{entryId}             ← subcollection; one document per food logged
  savedMeals/{mealId}/
    foods/{foodId}                ← subcollection; snapshot of each food in the saved meal
```

All writes are atomic operations on individual documents. No array mutations.

### Goals

- **Macros:** Grams are the primary input. Percentage of daily calories is a read-only derived display (protein/carbs: 4 cal/g, fat: 9 cal/g).
- **Micros:** Gram targets for all seven tracked micronutrients.
- **UI:** Captured in an onboarding flow on first login. Editable anytime via a "Goals" button in the journal tab header (opens a modal).

### Journal UI

**Date navigation:** Defaults to today. Back/forward arrows step through days. Tapping the date label opens a calendar picker for larger jumps.

**Progress display:**
- Persistent header: calories remaining + protein/carbs/fat progress bars
- Collapsible "Nutrition Details" section: progress bars for all seven micronutrients

**Meal sections:** Breakfast, Lunch, Dinner, Snacks — each with:
- **+ Add food** — opens the global food search modal with this meal pre-selected
- **+ Add saved meal** — opens a saved meal picker; tapping one writes each food as an independent entry into this meal slot

**Food search modal:** One shared modal (not four inline search inputs). Flow: type to search → results list with brief macro summary → tap result → full nutrition panel + serving size selector + quantity input → confirm.

**Serving size:** Portion dropdown populated from API data (e.g. "1 cup (240g)", "3 oz (85g)") plus a "grams" option always available. User enters a quantity multiplier. Snapshot stores both the human-readable description and the computed gram weight.

### Saved Meals

- **Management:** "Saved Meals" button in journal header opens a modal to create, rename, edit (add/remove foods), and delete saved meals.
- **Adding foods to a saved meal:** Same search modal as daily logging.
- **Using a saved meal:** "+ Add saved meal" button per meal section opens a list picker. Selecting a saved meal writes each food as an independent, individually deletable entry — no grouping.

---

## Authentication & Access Control

**Auth:** Google Sign-In via Firebase Auth for the entire app. The login screen is the entry point to everything.

**Access control:** UID whitelist enforced in Firebase Security Rules (not app middleware). Any Google account can attempt sign-in; only whitelisted UIDs are granted access. Switching to open registration requires only a Security Rules change — the data model is unaffected.

**Secrets (must stay in `.env.local`, never committed):** Firebase Admin SDK service account credentials, Anthropic API key, USDA API key. Firebase client config is designed to be public and is safe in the public GitHub repo.

**Scale target:** Solo use initially; ~10–15 users within one year.

---

## Persistence Architecture

### Phase 1 — Disk (current RAG chat)
- Vector store persists to `data/vector-stores/{uid}.json` per user
- Loaded on server startup; written on every `addDocuments` call

### Phase 2 — Firebase (nutrition journal + RAG migration)
- **Firestore:** nutrition log entries, saved meals, goals, user profiles, vector store data
- **Firebase Storage:** original uploaded prep documents
- **Auth:** Google Sign-In (see above)

### Phase 3 — RAG + Journal Integration
- Inject today's nutrition log summary into RAG context
- Enable cross-cutting queries: "based on my prep plan and what I've eaten today, what should I have for dinner?"

---

## Navigation

Top tab bar with **Chat** and **Journal** tabs. Capacity for ~2 additional future tabs before crowding. User avatar / sign-out control in the top-right corner of the app shell. Auth guards at the layout level redirect unauthenticated users to `/login`.

---

## Session State Management

- Conversation history managed client-side
- Full history sent with each request as a formatted string
- No server-side session state (stateless API)

---

## Constraints

- Streaming responses required for chat
- No medical advice; always defer to coach
- Next.js API body size limit set to 10MB for documents
- Demo-focused scope; no cross-user document sharing

## Out of Scope (Current)

- Cross-user document sharing
- OCR for scanned/image-only PDFs
- Advanced admin features
- Production deployment optimizations
- Multi-user support (beyond whitelist access)
- Vitamin/mineral tracking beyond the seven selected micronutrients

---

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
| Markdown | `react-markdown` + `remark-gfm` |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firebase Firestore |
| File storage | Firebase Storage |
| Food APIs | USDA FoodData Central + Open Food Facts |
| Styling | Tailwind CSS v4 |
| Tests | Vitest + Testing Library |
