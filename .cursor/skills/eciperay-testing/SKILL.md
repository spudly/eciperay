---
name: eciperay-testing
description:
  Testing best practices for the Eciperay monorepo (Express server, Vite web
  app, React Native app, shared client). Use when writing or reviewing tests,
  setting up coverage, or deciding what to mock.
disable-model-invocation: true
---

# Eciperay Testing

## Stack

| Package           | Test runner                           | Key libraries                           |
| ----------------- | ------------------------------------- | --------------------------------------- |
| `packages/server` | Jest 30 + ts-jest (ESM)               | supertest, nock                         |
| `packages/client` | Jest 30 + ts-jest (ESM)               | `@testing-library/react` (AuthProvider) |
| `packages/web`    | Vitest 3 + Vite config                | `@testing-library/react`, MSW, `jsdom`  |
| `packages/app`    | Jest 29 + `@react-native/jest-preset` | `@testing-library/react-native`         |

### Why Vitest for web (not Jest)

`packages/web` is Vite + native ESM. Vitest reuses the same transform pipeline,
aliases, and env handling as `vite.config.ts`, so tests match dev/build module
resolution. Jest would require a second config layer for a stack that already
uses Jest elsewhere (server, client, app). Use Vitest only for web; use Jest for
Node and React Native packages.

## Naming conventions

- Always `test()`, never `it()`
- `describe('functionName', () => { test('does X when Y', ...) })`
- AAA structure: Arrange / Act / Assert — one blank line between each section

## Server: unit vs integration

Write a **unit test** (in `src/lib/`) when the function:

- Takes plain inputs and returns a plain output (no I/O)
- Can be tested by calling it directly

Write a **supertest integration test** (in `src/routes/`) when:

- The function is an Express route handler
- You want to verify HTTP status codes, response bodies, and middleware
  interaction

## Server: mocking strategy

Two mechanisms only — never mock `supabase.ts` or `anthropic.ts` as modules:

| What               | How                                                       |
| ------------------ | --------------------------------------------------------- |
| **Database**       | Dependency injection — `createApp({query: mockQuery})`    |
| **Supabase auth**  | nock — intercepts `supabase.auth.getUser()` HTTP call     |
| **Anthropic API**  | nock — intercepts `anthropic.messages.create()` HTTP call |
| **External fetch** | nock — intercepts outgoing `fetch()` calls                |

### DI pattern

```typescript
// In tests:
const mockQuery = createMockQuery(); // from src/test/mockQuery.ts
const app = createApp({query: mockQuery});

// beforeEach:
mockQuery.mockResolvedValue(makeQueryResult([makeRecipe()]));
```

### nock pattern

```typescript
// beforeEach:
nockSupabaseGetUser('user-uuid'); // from src/test/mockNockSupabase.ts
nockAnthropicMessage('{"result": ...}'); // from src/test/mockNockAnthropic.ts
```

`nock.cleanAll()` and `jest.resetAllMocks()` run globally in `jest.setup.ts`
`afterEach` — individual tests never need to call these.

## Server: what NOT to test

Exclude from coverage in `jest.config.cjs`:

| File                | Why                                 |
| ------------------- | ----------------------------------- |
| `src/loadEnv.ts`    | Side-effect only — loads env vars   |
| `src/db/migrate.ts` | CLI script, requires live DB        |
| `src/db/pool.ts`    | `pg.Pool` constructor only          |
| `src/db/query.ts`   | Thin wrapper around `pg.Pool.query` |

## App: mocking strategy

The app uses Babel, so `jest.mock()` is hoisted correctly — no
`jest.unstable_mockModule` needed.

| What                 | How                                |
| -------------------- | ---------------------------------- |
| **Supabase**         | `jest.mock('../lib/supabase')`     |
| **API calls**        | `jest.mock('../lib/api')`          |
| **React Navigation** | Mocked in `jest.setup.js` globally |
| **Native modules**   | Mocked in `jest.setup.js` globally |

### React Query screens

Wrap in a fresh `QueryClientProvider` with `retries: 0`:

```typescript
const queryClient = new QueryClient({defaultOptions: {queries: {retry: 0}}});
render(<QueryClientProvider client={queryClient}><RecipesScreen /></QueryClientProvider>);
```

## Web: mocking strategy

| What            | How                                                 |
| --------------- | --------------------------------------------------- |
| **HTTP API**    | MSW handlers in `src/test/msw/`                     |
| **Supabase**    | `vi.mock` in `src/test/setup.ts`                    |
| **Auth/routes** | `renderWithProviders()` in `src/test/testUtils.tsx` |

Setup lives in `src/test/setup.ts`. Tests fail on `console.error` via shared
`test/failOnConsoleError.cjs`.

## Coverage thresholds

All code packages require **100%** on branches, functions, lines, and
statements.

Run coverage: `npm run test:coverage` (at monorepo root via Turbo)

## Test helpers (server)

All in `packages/server/src/test/` — excluded from coverage:

- `mockQuery.ts` — `createMockQuery()` returns typed `jest.fn()`
- `mockNockSupabase.ts` — `nockSupabaseGetUser(userId)` registers nock intercept
- `mockNockAnthropic.ts` — `nockAnthropicMessage(text)` registers nock intercept
- `fixtures/recipe.ts` — `makeRecipe()`, `makeRecipeDetail()`,
  `makeRecipeInput()`
- `fixtures/ingredient.ts` — `makeIngredient()`, `makeIngredientInput()`
- `fixtures/instruction.ts` — `makeInstruction()`, `makeInstructionInput()`
- `fixtures/tag.ts` — `makeTag()`
- `fixtures/recipeDraft.ts` — `makeRecipeDraft()`, `makeRecipeDiff()`
- `fixtures/user.ts` — `makeUser()`
- `fixtures/aiMessage.ts` — `makeAiMessage()`, `makeAiConversation()`
- `fixtures/queryResult.ts` — `makeQueryResult(rows)` wraps rows in
  `pg.QueryResult` shape
