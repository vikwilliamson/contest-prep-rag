# Tech Debt

## General

- [ ] Remove all debug/unused code from the codebase
- [ ] Extract shared test helpers into a dedicated file (e.g. `test/helpers.ts`) for better organisation — candidates include the `fakeChainStream` generator, `makeRequest` factory, and the `@huggingface/transformers` mock factory that is duplicated across `task4a.test.ts` and `task4b.test.ts`

# Planned UI Features

## Chat Interface

- [ ] Animated typing indicator (three-dot) shown before the first token arrives — current pulsing cursor only appears once streaming begins
- [ ] Markdown rendering for assistant messages (`react-markdown` + `remark-gfm`)
- [ ] Source citations below each assistant reply (filename of retrieved chunks)
- [ ] Quick-prompt chips for common NPC/IFBB questions
- [ ] Copy button on assistant messages
- [ ] Clear conversation button

## Upload Panel

- [ ] File type icons (PDF vs DOCX) in the uploaded document list
- [ ] Toast notifications for upload success/failure
