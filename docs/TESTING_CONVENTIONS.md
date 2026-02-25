# Testing Conventions for AI-Assisted Test Development

This document defines the conventions that AI agents should follow when generating Playwright E2E tests for this application.

## Test Structure

Every test follows Arrange-Act-Assert:

```typescript
test("descriptive name of what is being verified", async ({ page }) => {
  // Arrange: set up preconditions
  await page.goto("/");
  await selectUser(page, "alice");
  await selectChannel(page, "general");
  await waitForMessages(page);

  // Act: perform the user action
  await sendTestMessage(page, "Hello!");

  // Assert (DOM): verify what the user sees
  await expect(page.getByText("Hello!")).toBeVisible();

  // Assert (State): verify the data layer
  const state = await getAppState(page);
  expect(state.totalMessages).toBe(6);
});
```

## Assertion Layers

Tests should assert at multiple layers when meaningful:

### DOM Assertions (always)
Verify what the user sees. Use a11y selectors (see SELECTORS.md).

```typescript
await expect(page.getByText("message content")).toBeVisible();
await expect(page.getByRole("status")).toHaveText(/No messages/);
```

### State Assertions (when verifying data changes)
Use `getAppState(page)` to check the data layer directly.

```typescript
const state = await getAppState(page);
const channel = state.channels.find(c => c.name === "general");
expect(channel?.messageCount).toBe(4);
```

### Component Tree Assertions (experimental)
Use `getComponentTree(page)` to inspect React component structure.
This is experimental and may not work across React versions.

## Helper Functions

Import from `e2e/helpers.ts`:

| Helper | Purpose | Request-Aware |
|--------|---------|---------------|
| `selectUser(page, username)` | Click a user in the user selector | No (client-only state) |
| `selectChannel(page, channelName)` | Click a channel in the channel list | Yes — waits for `GET /api/channels/{id}/messages` |
| `sendTestMessage(page, content)` | Type and send a message | Yes — waits for `POST` and subsequent `GET` refetch |
| `waitForMessages(page)` | Wait for message area DOM to be ready | No (DOM gate, not network) |
| `waitForNetworkIdle(page, timeout?)` | Wait until all in-flight fetches complete | Yes — uses fetch tracker |
| `getPendingRequests(page)` | Get list of currently in-flight requests | Yes — uses fetch tracker |
| `getAppState(page)` | Get current app state from data layer | Direct API call (awaited) |
| `resetDatabase(page)` | Clear all data via test endpoint | Direct API call (awaited) |
| `seedDatabase()` | Reseed database with test fixtures | Blocking subprocess |

## Test Isolation

Every test must be independent:

```typescript
test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
  await seedDatabase();
});
```

## Naming Conventions

- Test files: `e2e/{feature}.spec.ts`
- Describe blocks: feature area ("Send a message", "Channel navigation")
- Test names: specific behavior being verified

## What NOT to Do

- Never use CSS selectors (`.class`, `#id`, `div > span`)
- Never depend on DOM structure or nesting
- Never assume channel/user ordering without explicitly selecting
- Never skip the Arrange step — always set up known state
- Never use `page.waitForTimeout()` — use semantic waiters instead

## Seed Data Reference

The seed script creates:

**Users:** alice, bob, charlie (IDs: user-alice, user-bob, user-charlie)

**Channels:** empty, general, random (sorted alphabetically)
- empty: 0 members, 0 messages
- general: 3 members (alice, bob, charlie), 3 messages
- random: 2 members (alice, bob), 2 messages

**Important:** Channels are sorted alphabetically, so "empty" is the first/default channel.
