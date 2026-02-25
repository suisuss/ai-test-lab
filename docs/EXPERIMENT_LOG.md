# Experiment Log

Running log of experiments, findings, and iterations on AI-assisted test development conventions.

## 2026-02-25: Initial Scaffold

**Setup:** Next.js 16 + React 19 + Prisma 6 (SQLite) + Playwright + Tailwind

**Architecture:** Four-layer (UI / Handlers / Data / System) with strict dependency rules. UI components are dumb (props in, callbacks out), handlers coordinate, data layer talks to Prisma.

**Test instrumentation built:**
- `/api/test-utils/state` endpoint for data layer assertions
- `/api/test-utils/reset` endpoint for test isolation
- React component tree serializer via `window.__TEST_COMPONENT_TREE__`
- Playwright helpers: `getAppState()`, `getComponentTree()`, `selectUser()`, `selectChannel()`, `sendTestMessage()`, `waitForMessages()`

**Reference tests written:** 5 tests covering send message, switch channels, message persistence, empty state, and component tree inspection.

**Results:**
- 5/5 tests passing
- a11y selectors work well for all current UI elements — no data-testid needed yet
- `getAppState()` works reliably for data layer assertions
- Component tree serializer fully working with React 19 (see fix below)

### Finding: React 19 Fiber Key Format (RESOLVED)

The component tree serializer initially returned null with React 19. Root cause was two issues:

**Issue 1: Root container changed.** Next.js App Router mounts React at `<html>`, not `#__next` (which was a Pages Router convention). Fixed by trying `document.body` and `document.documentElement` as fallback root containers.

**Issue 2: Depth limits vs unnamed fiber chains.** React 19 + Next.js App Router wraps page content in ~30 unnamed context providers (SegmentStateProvider, TemplateContext, ScrollAndFocusHandler, etc.). The original serializer counted ALL fibers toward the depth limit, hitting the ceiling before reaching application components. Fixed by only counting depth for NAMED nodes (components and DOM elements), treating unnamed wrappers as transparent pass-throughs.

**Key insight:** The `__reactFiber$` prefix is unchanged in React 19. The fiber tree structure is fundamentally the same — what changed is the mount point and the depth of the framework wrapper chain.

The component tree test now asserts:
- `Home`, `MessageList`, `ChannelList`, `UserSelector` are all findable
- `UserSelector` has `users` and `currentUserId` props
- `MessageList` has `channelName` prop matching the selected channel

**Next steps:**
- ~~Test whether an AI agent (Claude) can generate new tests that follow the conventions by providing it only the docs~~ Done (see below)

---

## 2026-02-25: AI Test Generation Experiment

**Goal:** Validate whether the documentation alone is sufficient for an AI agent to generate correct, meaningful Playwright tests without reading any application source code.

**Method:** A Claude agent was given access to ONLY:
- `docs/ARCHITECTURE.md`
- `docs/TESTING_CONVENTIONS.md`
- `docs/SELECTORS.md`
- `docs/STATE_API.md`
- `e2e/helpers.ts` (test API surface)

The agent was explicitly prohibited from reading any files in `src/`, `e2e/messaging.spec.ts`, or any component/page source code.

**Result: 16/16 tests generated and passing.**

All 21 tests (5 reference + 16 AI-generated) pass together in the full suite.

### Generated Test Coverage

| Category | Tests | Techniques Used |
|---|---|---|
| Multi-message sequencing | 2 | DOM assertions, state API counts |
| User switching + attribution | 2 | `role="article"` name matching, `aria-checked` state |
| State API correctness | 3 | Baseline verification, reset/reseed roundtrip, zero-state |
| Channel member counts | 2 | State API structural assertions |
| Empty channel edge cases | 2 | `role="status"` detection, empty-to-populated transition |
| Component tree verification | 2 | `findComponent()`, tree persistence across navigation |
| Channel navigation a11y | 2 | `aria-label` on `role="log"`, `aria-selected` on options |
| Message input context | 1 | `getByLabel` reflecting channel name |

### Analysis

**What worked well:**

1. **a11y selectors were the primary enabler.** Every test uses `getByRole`, `getByLabel`, or `getByText`. The agent never needed CSS selectors or data-testid — the semantic markup was sufficient for all 16 tests. This validates the decision to invest in proper aria attributes.

2. **State API enabled data-layer assertions without source code.** Tests like "state reflects zero data after reset without reseed" and "messages sent to different channels are counted separately" would be impossible with DOM-only assertions. The state endpoint gave the agent a way to verify behavior that isn't visible in the UI.

3. **TESTING_CONVENTIONS.md was the critical doc.** The seed data reference section (which users/channels exist, their IDs, message counts, sort order) prevented the agent from making incorrect assumptions. The explicit note about alphabetical channel ordering prevented the same bug we hit during initial development.

4. **helpers.ts as an API surface.** Treating the helpers file as documentation (not source code) was the right call. The agent used `selectUser`, `selectChannel`, `sendTestMessage`, `waitForMessages`, `getAppState`, `getComponentTree`, `findComponent`, `resetDatabase`, and `seedDatabase` — the full helper API — without needing to understand their implementation.

**What the agent did NOT need:**
- Component source code (never read `page.tsx`, `message-list.tsx`, etc.)
- Handler implementation details
- Data layer / Prisma schema
- API route implementations
- CSS / styling information

**Limitations observed:**

1. **Component tree assertions were shallow.** The agent verified components exist and persist across navigation, but didn't assert on props (e.g., `MessageList.props.channelName`) the way the reference tests do. This suggests the STATE_API.md documentation for the component tree could include more examples of prop-level assertions.

2. **No negative test cases.** The agent didn't generate tests for error conditions (e.g., sending empty messages, invalid state transitions). This makes sense — the docs describe happy-path behavior and the helpers enforce valid actions. To get error-case tests, we'd need to document error behaviors explicitly.

3. **No performance or timing assertions.** All tests use semantic waiters correctly, but none verify that operations complete within reasonable timeframes. This could be a future doc addition.

### Conclusion

The documentation-only approach works. The combination of layered architecture docs, a11y selector conventions, test state API, and explicit seed data documentation provides sufficient context for an AI agent to generate correct E2E tests without reading application source code. The 100% pass rate (16/16) on first generation (after iterative debugging within the agent) validates the core thesis of this project.

### Finding: Channel Sort Order Matters

Auto-selected channel is alphabetically first ("empty"), not "general". Tests that assume a specific default channel need to explicitly select it. This is a good lesson for AI test generation: never assume implicit state.

### Finding: SQLite Path Resolution

Prisma CLI resolves `DATABASE_URL` relative to schema file location. Prisma Client runtime resolves it relative to CWD. These can differ. Fixed by using absolute paths in the client singleton (`path.join(process.cwd(), "prisma", "dev.db")`).
