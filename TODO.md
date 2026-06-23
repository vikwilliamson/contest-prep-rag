# Tech Debt

## General

- [ ] Remove all debug/unused code from the codebase
- [ ] Extract shared test helpers into a dedicated file (e.g. `test/helpers.ts`) for better organisation — candidates include the `fakeChainStream` generator, `makeRequest` factory, and the `@huggingface/transformers` mock factory that is duplicated across `task4a.test.ts` and `task4b.test.ts`

# Planned UI Features

## Chat Interface

- [x] Animated typing indicator (three-dot) shown before the first token arrives
- [x] Markdown rendering for assistant messages (`react-markdown` + `remark-gfm`)
- [x] Source citations below each assistant reply — `__SOURCES__` suffix in stream, parsed client-side
- [x] Quick-prompt chips for common NPC/IFBB questions
- [x] Copy button on assistant messages
- [x] Clear conversation button

## Upload Panel

- [x] File type icons (PDF vs DOCX) in the uploaded document list
- [x] Toast notifications for upload success/failure
