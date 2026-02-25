# Test State API

Dev-only API endpoints that expose application state for test assertions and database management.

## Endpoints

### GET /api/test-utils/state

Returns the current application state from the data layer.

**Response:**
```json
{
  "users": [
    { "id": "user-alice", "username": "alice" },
    { "id": "user-bob", "username": "bob" },
    { "id": "user-charlie", "username": "charlie" }
  ],
  "channels": [
    { "id": "channel-empty", "name": "empty", "memberCount": 0, "messageCount": 0 },
    { "id": "channel-general", "name": "general", "memberCount": 3, "messageCount": 3 },
    { "id": "channel-random", "name": "random", "memberCount": 2, "messageCount": 2 }
  ],
  "totalMessages": 5
}
```

**Usage in tests:**
```typescript
const state = await getAppState(page);
expect(state.totalMessages).toBe(5);
```

### POST /api/test-utils/reset

Deletes all data from the database (messages, channel members, channels, users).

**Response:**
```json
{ "ok": true }
```

**Usage in tests:**
```typescript
await resetDatabase(page);
```

## Security

Both endpoints return 404 in production (`NODE_ENV=production`). They are only available in development mode.

## Component Tree Inspector

In development mode, the app exposes `window.__TEST_COMPONENT_TREE__` — a function that walks the React fiber tree and returns a serialized representation of the component hierarchy.

**Access in tests:**
```typescript
const tree = await getComponentTree(page);
```

**Returns:** `ComponentNode | null`
```typescript
type ComponentNode = {
  type: string;           // Component name
  props: Record<string, unknown>;  // Sanitized props (no functions)
  aria: Record<string, string>;    // aria-* and role attributes
  children: ComponentNode[];
};
```

**Status:** Working with React 19 + Next.js 16 App Router. The serializer handles the deep provider chain (~30 unnamed context wrappers) by flattening through unnamed fibers without counting them toward the depth limit. Application components (Home, MessageList, ChannelList, UserSelector) are correctly resolved with their props and aria attributes.
