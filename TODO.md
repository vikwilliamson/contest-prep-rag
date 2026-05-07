# Tech Debt

## General

- [ ] Remove all debug/unused code from the codebase
- [ ] Extract shared test helpers into a dedicated file (e.g. `test/helpers.ts`) for better organisation — candidates include the `fakeChainStream` generator, `makeRequest` factory, and the `@huggingface/transformers` mock factory that is duplicated across `task4a.test.ts` and `task4b.test.ts`
