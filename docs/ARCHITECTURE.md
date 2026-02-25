# Architecture

## Layered Architecture

The application follows a strict four-layer architecture with unidirectional data flow. Each layer has clear responsibilities and dependency rules.

```
UI (presentational) -> Handlers (coordination) -> Data (state/persistence) -> System (infrastructure)
```

### Layer Definitions

**UI Layer** (`src/ui/`)
- Presentational components only — props in, callbacks out
- No business logic, no data fetching, no side effects
- Responsible for: rendering, layout, styling, user interaction feedback
- Can import from: handlers (via props/callbacks), never directly from data or system

**Handler Layer** (`src/handlers/`)
- Coordinates between UI actions and data operations
- Contains: fetch wrappers, form submission logic, event coordination
- Responsible for: translating user actions into data operations
- Can import from: data layer APIs

**Data Layer** (`src/data/`)
- State management and persistence
- Contains: Prisma repositories, React Query hooks, API clients
- Responsible for: CRUD operations, data transformation, cache management
- Can import from: system layer (db client, auth context)

**System Layer** (`src/system/`)
- Infrastructure concerns
- Contains: authentication, logging, websocket, utilities
- Responsible for: cross-cutting concerns that don't belong in business logic
- Can import from: nothing (leaf layer)

### App Router Pages (`src/app/`)

Pages are thin orchestration — they compose UI components with handlers, pass down data from server-side fetching, and define route structure. They are NOT a layer; they wire layers together.

### API Routes (`src/app/api/`)

API routes delegate to data layer repositories. They handle HTTP concerns (request parsing, response formatting, status codes) but contain no business logic.

## Dependency Rules

- UI never imports from data or system directly
- Handlers never import from UI
- Data never imports from handlers or UI
- System never imports from any other layer
- Pages can import from any layer (they are the composition root)

## Why This Structure

The strict separation enables AI-assisted test development:

1. **UI components are predictable** — given props, they produce deterministic output. Tests can verify rendering without understanding data flow.
2. **Handlers are testable units** — they coordinate operations with clear inputs/outputs. Tests can mock the data layer and verify handler behavior.
3. **Data layer is independently verifiable** — repository functions can be tested with a real database. The test state endpoint (`/api/test-utils/state`) exposes data layer state directly.
4. **Layer boundaries are grep-able** — an AI agent can verify architecture compliance by checking import paths.
