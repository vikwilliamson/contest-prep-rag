# Handoff — Issue #2: Auth + App Shell

**Branch:** `feat/issue-2-auth-app-shell` (branched from `feat/issue-7-saved-meals`)
**Suite baseline:** 43 test files, 267 tests, all green.

---

## Context

This is a Next.js 15 + Firebase + Vitest project. Issues #3–#7 are fully implemented.
Issue #2 (Auth + App Shell) is the last remaining feature. Firebase auth was previously
disabled — the app was gated with HTTP Basic Auth (`proxy.ts`) and all routes used a
hardcoded `uid = "anonymous"`. The task is to re-enable real auth end-to-end.

**AGENTS.md warning:** this Next.js version has breaking changes from what the model
knows. Read `node_modules/next/dist/docs/` before touching routing. In particular,
`middleware` is renamed `proxy` in this version.

---

## What is already done (no code changes needed)

| What | Where | Notes |
|---|---|---|
| `getVectorStore(uid)` per-UID map | `lib/vectorStore.ts` | Exists, works. Needs **disk persistence** added. |
| `getRagChain(uid)` per-UID map | `lib/ragChain.ts` | Exists, works. No changes needed. |
| `verifyIdToken(request)` | `lib/firebase-admin.ts` | Written, dormant — just needs to be called from routes. |
| `AuthProvider` / `useAuth` | `lib/auth-context.tsx` | Working. Tests in `test/auth-context.test.tsx`. |
| `makeAuthRequest(body, method, uid)` | `test/helpers.ts` | Already in helpers, returns request with `Authorization: Bearer mock-token-{uid}`. |
| Login page UI | `app/(auth)/login/page.tsx` | Google + email/password UI exists. Missing: redirect to `/chat` after success. |
| App shell tab bar | `app/(app)/layout.tsx` | Chat + Journal links render. Missing: `useAuth` guard + redirect to `/login`. |

---

## TDD Plan — 10 vertical slices

Work one slice at a time: write the test (RED), then the minimal implementation (GREEN).
Do not write multiple tests before implementing.

**Plan revision (2026-07-01, reviewed with user):** the original 6-slice plan had a
critical gap — server routes would demand Bearer tokens but no client fetch sent one,
so the app would be broken at runtime with all tests green. Slices 4 (authFetch), 7
(sign-out/avatar), 9 (ALLOWED_UIDS whitelist), and 10 (remove proxy.ts) were added.
Decisions made with the user:

- **Whitelist:** enforced server-side via an `ALLOWED_UIDS` env var checked in
  `verifyIdToken` (empty/unset = allow all). Firebase Security Rules can't enforce it —
  all data access goes through Admin SDK routes which bypass rules.
- **proxy.ts:** removed entirely. Its Basic Auth reads the same `Authorization` header
  the Bearer tokens need; the two schemes conflict. Firebase auth replaces it.
- **Shell scope:** sign-out + avatar control and active-tab indication are in scope
  (both are issue #2 acceptance criteria).

---

### Slice 1 — Vector store disk persistence

**Test file:** `test/vector-store-persistence.test.ts` (new)

**Behaviors to test:**

1. After `store.addDocuments(docs)`, `fs/promises.writeFile` is called with path
   `data/vector-stores/{uid}.json` containing the serialized entries (vectors + page content).
2. When `getVectorStore(uid)` is called cold (not in the map) and the JSON file exists,
   it deserializes and pre-populates the store's entries before returning.
3. When no file exists, `getVectorStore(uid)` returns an empty store (no error).

**Implementation touch points:** `lib/vectorStore.ts` only.

**Mocking:** mock `fs/promises` (`readFile`, `writeFile`, `mkdir`) — do NOT mock the
`InMemoryVectorStore` class itself.

**Pattern to follow:** look at `test/entries-store.test.ts` for how this project mocks
a module and then imports the thing under test.

---

### Slice 2 — `/api/chat` auth guard

**Test file:** `test/chat-route.test.ts` (new)

**Behaviors to test:**

1. POST with no `Authorization` header → 401.
2. POST with a token that `verifyIdToken` rejects → 401.
3. POST with a valid token → `getRagChain` is called with the uid from the token (not `"anonymous"`).

**Implementation touch point:** `app/api/chat/route.ts` — replace `const uid = "anonymous"`
with `const uid = await verifyIdToken(request)` wrapped in try/catch → 401.

**Mocking:**
```ts
vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))
vi.mock('../lib/ragChain', () => ({ getRagChain: vi.fn() }))
```

**Pattern to follow:** `test/journal-entries-route.test.ts` — same vi.mock + import pattern.

---

### Slice 3 — `/api/upload` auth guard + uid-scoped file paths

**Test file:** `test/upload-route.test.ts` (UPDATE existing — the current tests assert
"no auth needed" which will become wrong; replace those two tests with auth-aware versions)

**Behaviors to test:**

1. POST without `Authorization` header → 401.
2. DELETE without `Authorization` header → 401.
3. POST with valid token → file saved to `uploads/{uid}/{filename}` (not `uploads/{filename}`).
4. DELETE with valid token → file unlinked from `uploads/{uid}/{filename}` (the uid-scoped
   path must apply to DELETE too, or deletes silently 404 once uploads land in per-uid dirs).

**Implementation touch points:** `app/api/upload/route.ts` — replace `const uid = "anonymous"`
with `verifyIdToken`; change `UPLOADS_DIR` path from `join(process.cwd(), "uploads")` to
`join(process.cwd(), "uploads", uid)` (create with `mkdir` if needed).

**Mocking:** same `vi.mock('../lib/firebase-admin', ...)` pattern as slice 2.
Use `makeAuthRequest` from `test/helpers.ts` for authenticated requests.

---

### Slice 4 — Client `authFetch` wrapper (NEW — closes the runtime gap)

**Test file:** `test/auth-fetch.test.ts` (new)

The server guards in slices 2, 3, 6, and 8 demand `Authorization: Bearer <idToken>`,
but no client fetch sends one. Without this slice every API call 401s at runtime.
One choke point instead of ~20 hand-edited fetches.

**Behaviors to test:**

1. `authFetch(url, init)` calls `getIdToken()` on the current user and forwards to
   `fetch` with `Authorization: Bearer <token>` merged into headers (preserving any
   headers passed in `init`, e.g. `Content-Type`).
2. When no user is signed in, `authFetch` rejects (or returns a synthetic 401) —
   it must NOT call `fetch` unauthenticated.

**Implementation touch points:**

- `lib/authFetch.ts` (new) — uses `getAuth().currentUser.getIdToken()` from `lib/firebase.ts`.
- Swap `fetch` → `authFetch` at every API call site:
  `components/ChatInterface.tsx`, `components/UploadPanel.tsx`,
  `components/FoodSearchModal.tsx`, `components/SavedMealsModal.tsx`,
  `components/SavedMealPicker.tsx`, `app/(app)/journal/page.tsx`.
- Existing component tests mock `fetch` globally; after the swap, mock
  `lib/authFetch` instead (or mock `lib/firebase`'s `getAuth` so `authFetch`
  degrades to plain `fetch` in tests) — pick whichever needs fewer edits.

**Mocking:** `vi.mock('../lib/firebase', () => ({ getAuth: vi.fn() }))` with a fake
`currentUser.getIdToken` resolving `'mock-token'`; stub `global.fetch` with `vi.fn()`.

---

### Slice 5 — Login page redirect after sign-in

**Test file:** `test/login-page.test.tsx` (ADD tests to the existing file)

**Behaviors to test:**

1. After clicking "Sign in with Google" and `signInWithGoogle()` resolves successfully,
   `router.push('/chat')` is called.
2. After submitting the email/password form and `signInWithEmail()` resolves,
   `router.push('/chat')` is called (the UI supports both methods; both must redirect).

**Implementation touch point:** `app/(auth)/login/page.tsx` — import `useRouter` from
`next/navigation`; call `router.push('/chat')` in `handleGoogle()` and `handleSubmit()`
after the sign-in promise resolves.

**Mocking:**
```ts
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
```

Add this mock at the top of the existing `test/login-page.test.tsx`. The existing tests
should still pass (they don't assert on router behavior).

---

### Slice 6 — App layout auth guard + active tab indication

**Test file:** `test/app-shell.test.tsx` (UPDATE existing — current tests assume no guard;
replace or augment them)

**Behaviors to test:**

1. While `useAuth` is loading → renders nothing (or a spinner, your call).
2. `useAuth` returns `{ user: null, loading: false }` → `router.replace('/login')` is called,
   children are not rendered.
3. `useAuth` returns `{ user: { uid: 'abc' }, loading: false }` → Chat + Journal tabs and
   children render normally.
4. With `usePathname()` returning `/chat`, the Chat tab has the active style (e.g.
   `aria-current="page"`) and Journal does not; assert via `aria-current`, not class names.

**Implementation touch point:** `app/(app)/layout.tsx` — add `useAuth()` + `useRouter()`
(becomes a client component); redirect when `!loading && !user`; use `usePathname()` to
set `aria-current` + active styling on the matching tab.

**Mocking:**
```ts
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/chat',
})
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }))
```

---

### Slice 7 — Sign-out + avatar control in shell header (NEW — issue #2 AC)

**Test file:** `test/app-shell.test.tsx` (ADD tests)

**Behaviors to test:**

1. Authenticated shell renders a sign-out control in the header.
2. Clicking sign-out calls `signOut()` from `lib/firebase`; the layout guard from
   slice 6 then handles the redirect to `/login` when auth state flips to null
   (assert `signOut` was called — the redirect is already covered by slice 6 tests).

**Implementation touch point:** `app/(app)/layout.tsx` — avatar/initial + sign-out
button in the top-right of the nav bar, calling `signOut()` from `lib/firebase`.

**Mocking:** `vi.mock('../lib/firebase', () => ({ signOut: vi.fn() }))` alongside the
existing auth-context mock.

---

### Slice 8 — Journal + food-search API routes auth guard

**Discovered during plan review:** 7 more routes hardcode `const uid = "anonymous"` at
module scope, the same pattern slice 2 fixes for `/api/chat`. Not part of the original
handoff — needed for auth to actually be "end-to-end."

**Routes + their existing test files (UPDATE each — replace the "auth disabled, 401
skipped" tests with 401 assertions):**

| Route | Test file |
|---|---|
| `app/api/journal/[date]/entries/route.ts` (GET, POST) | `test/journal-entries-route.test.ts` |
| `app/api/journal/[date]/entries/[entryId]/route.ts` (DELETE) | `test/journal-entry-delete-route.test.ts` |
| `app/api/journal/goals/route.ts` (GET, PUT) | `test/journal-goals-route.test.ts` |
| `app/api/journal/saved-meals/route.ts` (GET, POST) | `test/saved-meals-route.test.ts` |
| `app/api/journal/saved-meals/[mealId]/route.ts` (PATCH, DELETE) | `test/saved-meal-id-route.test.ts` |
| `app/api/journal/saved-meals/[mealId]/foods/route.ts` (GET, POST) | `test/saved-meal-foods-route.test.ts` |
| `app/api/journal/saved-meals/[mealId]/foods/[foodId]/route.ts` (DELETE) | `test/saved-meal-food-id-route.test.ts` |
| `app/api/food-search/route.ts` (GET) | `test/food-search-route.test.ts` |

`/api/food-search` was missing from the original plan — its own code comment says
"Restore token verification when re-enabling auth" and it proxies the USDA API key.
It has no uid-scoped data, so the guard is just verify-or-401 (behaviors 1 and 2 only).

**Behaviors to test (per route):**

1. Request without `Authorization` header → 401.
2. Request with a token `verifyIdToken` rejects → 401.
3. Request with a valid token → underlying store call (`getEntries`, `getGoals`,
   `listSavedMeals`, etc.) is called with the uid from the token, not `"anonymous"`.

**Implementation touch points:** in each route file, remove the module-scope
`const uid = "anonymous"` and instead resolve `uid` inside each handler via
`const uid = await verifyIdToken(request)` wrapped in try/catch → 401. Note some
handlers currently take `_request: NextRequest` (unused) — rename to `request` since
it's now needed.

**Mocking:** same as slice 2 —
```ts
vi.mock('../lib/firebase-admin', () => ({ verifyIdToken: vi.fn() }))
```
plus each route's existing store mock. Use `makeAuthRequest` from `test/helpers.ts`
(note: it hardcodes the URL to `/api/chat` — either extend it with a `url` param or
construct the `NextRequest` inline with the correct path/method for these routes,
following the existing `NextRequest(...)` pattern already used in these test files).

**Do this slice after slices 1–7**, since it's the largest surface area and
benefits from the auth-guard pattern being proven out in slice 2 first.

---

### Slice 9 — `ALLOWED_UIDS` whitelist in `verifyIdToken` (NEW)

**Test file:** `test/firebase-admin.test.ts` (new, or extend if one exists)

Issue #2 asks for a UID whitelist "enforced in Firebase Security Rules" — but all data
access goes through Admin SDK routes which bypass Security Rules, and the client never
touches Firestore directly, so Rules would enforce nothing. Decision (with user):
enforce server-side in `verifyIdToken` instead.

**Behaviors to test:**

1. `ALLOWED_UIDS` unset or empty → any successfully verified uid is returned (allow all).
2. `ALLOWED_UIDS="uid-a,uid-b"` and token verifies to `uid-a` → returned.
3. `ALLOWED_UIDS="uid-a"` and token verifies to `uid-z` → throws (routes already map
   any `verifyIdToken` throw to 401, so no route changes needed).

**Implementation touch point:** `lib/firebase-admin.ts` only — after `verifyIdToken`
decodes the uid, check it against the parsed env var. Use `vi.stubEnv` for tests;
mock `firebase-admin/auth`'s `getAuth().verifyIdToken`.

Document `ALLOWED_UIDS` in `.env.example` (do NOT read any real `.env` file — hard rule).

---

### Slice 10 — Remove proxy.ts Basic Auth gate (NEW)

**No new tests** — delete `proxy.ts` and its test file (find it with
`grep -rl "proxy" test/`). Run the full suite to confirm nothing else references it.

The Basic Auth gate reads the same `Authorization` header the Bearer tokens use; with
`GATE_USER`/`GATE_PASS` set it would 401 every authenticated API request before it
reaches the route. Firebase auth fully replaces it. Also delete the stale
"auth disabled / proxy.ts" comments this removal orphans (chat/upload/food-search
routes, `lib/firebase-admin.ts`, `app/(app)/layout.tsx`).

---

## Key patterns in this codebase

- **Module mocks** always go before the import of the module under test, hoisted via `vi.mock(...)`.
- **Route handler tests** import the handler dynamically after mocking:
  ```ts
  const { POST } = await import('../app/api/chat/route')
  ```
- **Firebase-admin mock** used across journal route tests:
  ```ts
  vi.mock('../lib/firebase-admin', () => ({ getAdminDb: vi.fn(), verifyIdToken: vi.fn() }))
  ```
- **Atomic Firestore writes** — prefer subcollection doc writes, not array mutations.
- **Never read `.env` files** — hard rule in this project.

---

## File map for this issue

```
lib/vectorStore.ts                         ← add disk persistence (slice 1)
app/api/chat/route.ts                      ← add auth guard (slice 2)
app/api/upload/route.ts                    ← add auth guard + uid path, POST & DELETE (slice 3)
lib/authFetch.ts                           ← new: Bearer-token fetch wrapper (slice 4)
components/ChatInterface.tsx               ← fetch → authFetch (slice 4)
components/UploadPanel.tsx                 ← fetch → authFetch (slice 4)
components/FoodSearchModal.tsx             ← fetch → authFetch (slice 4)
components/SavedMealsModal.tsx             ← fetch → authFetch (slice 4)
components/SavedMealPicker.tsx             ← fetch → authFetch (slice 4)
app/(app)/journal/page.tsx                 ← fetch → authFetch (slice 4)
app/(auth)/login/page.tsx                  ← router.push after Google + email sign-in (slice 5)
app/(app)/layout.tsx                       ← useAuth guard + active tab (slice 6), sign-out/avatar (slice 7)
app/api/journal/[date]/entries/route.ts                          ← add auth guard (slice 8)
app/api/journal/[date]/entries/[entryId]/route.ts                ← add auth guard (slice 8)
app/api/journal/goals/route.ts                                   ← add auth guard (slice 8)
app/api/journal/saved-meals/route.ts                             ← add auth guard (slice 8)
app/api/journal/saved-meals/[mealId]/route.ts                    ← add auth guard (slice 8)
app/api/journal/saved-meals/[mealId]/foods/route.ts              ← add auth guard (slice 8)
app/api/journal/saved-meals/[mealId]/foods/[foodId]/route.ts     ← add auth guard (slice 8)
app/api/food-search/route.ts                                     ← add auth guard (slice 8)
lib/firebase-admin.ts                      ← ALLOWED_UIDS whitelist (slice 9)
proxy.ts                                   ← DELETE (slice 10)

test/vector-store-persistence.test.ts      ← new (slice 1)
test/chat-route.test.ts                    ← new (slice 2)
test/upload-route.test.ts                  ← update (slice 3)
test/auth-fetch.test.ts                    ← new (slice 4)
test/login-page.test.tsx                   ← add tests (slice 5)
test/app-shell.test.tsx                    ← update (slices 6, 7)
test/journal-entries-route.test.ts         ← update (slice 8)
test/journal-entry-delete-route.test.ts    ← update (slice 8)
test/journal-goals-route.test.ts           ← update (slice 8)
test/saved-meals-route.test.ts             ← update (slice 8)
test/saved-meal-id-route.test.ts           ← update (slice 8)
test/saved-meal-foods-route.test.ts        ← update (slice 8)
test/food-search-route.test.ts             ← update (slice 8)
test/firebase-admin.test.ts                ← new or extend (slice 9)
test/proxy*.test.ts                        ← DELETE (slice 10)
```

---

## How to run tests

```bash
npx vitest run                             # full suite
npx vitest run test/chat-route.test.ts    # single file
```

Start with slice 1 tracer bullet. Write one test, confirm RED, implement, confirm GREEN,
then move to the next behavior within that slice before advancing to slice 2.
