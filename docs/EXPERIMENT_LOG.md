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
- Test whether an AI agent (Claude) can generate new tests that follow the conventions by providing it only the docs

### Finding: Channel Sort Order Matters

Auto-selected channel is alphabetically first ("empty"), not "general". Tests that assume a specific default channel need to explicitly select it. This is a good lesson for AI test generation: never assume implicit state.

### Finding: SQLite Path Resolution

Prisma CLI resolves `DATABASE_URL` relative to schema file location. Prisma Client runtime resolves it relative to CWD. These can differ. Fixed by using absolute paths in the client singleton (`path.join(process.cwd(), "prisma", "dev.db")`).
