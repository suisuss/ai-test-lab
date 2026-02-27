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

## Provider System

Each layer is implemented as a React Context provider. Providers are nested in dependency order so each layer can consume layers above it.

### Composition Order

```
<SystemProvider>        config, error handling, activity logging
  <DataProvider>        users, channels, messages state + fetch/mutation controllers
    <HandlerProvider>   event handlers that orchestrate data operations
      <UIProvider>      app-level UI state (app name, future: theme/layout)
        {children}
      </UIProvider>
    </HandlerProvider>
  </DataProvider>
</SystemProvider>
```

This nesting is defined in `src/app/providers.tsx` and mounted in `src/app/layout.tsx`.

### Hooks

| Hook | Provider | Returns |
|------|----------|---------|
| `useSystem()` | SystemProvider | `config`, `error`, `activity` |
| `useData()` | DataProvider | `users`, `channels`, `messages`, selection state, `controllers` |
| `useHandlers()` | HandlerProvider | `handleUserSelect`, `handleChannelSelect`, `handleSendMessage` |
| `useUI()` | UIProvider | `appName` |

### Data Flow

1. **UI components** remain pure — they receive data and callbacks via props from the page
2. **Page** (`src/app/page.tsx`) calls `useData()` and `useHandlers()` to get values and passes them as props
3. **HandlerProvider** consumes `useData()` to orchestrate: validate input, call data controllers, handle errors
4. **DataProvider** manages all client state and calls fetch functions from `src/handlers/messages.ts`
5. **SystemProvider** provides error handling and activity logging consumed by DataProvider

### Shared Types

Domain types (`User`, `Channel`, `Message`) are defined once in `src/types.ts` and imported by all layers.
