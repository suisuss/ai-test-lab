# Testing Conventions for AI-Assisted Test Development

This document defines the conventions that AI agents should follow when generating Playwright E2E tests for this application.

## Test Structure

Every test follows Arrange-Act-Assert:

```typescript
test("descriptive name of what is being verified", async ({ page }) => {
  // Arrange: log in and set up preconditions
  await loginAs(page, "alice");
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

Import from `e2e/helpers.ts`. The helpers file is the source of truth — read its JSDoc comments for up-to-date signatures and behavior.

Key helpers:

| Helper | Purpose |
|--------|---------|
| `loginAs(page, username, password?)` | Log in via the login page (password defaults to "password123") |
| `selectChannel(page, channelName)` | Click a channel in the channel list |
| `sendTestMessage(page, content)` | Type and send a message |
| `waitForMessages(page)` | Wait for message area to be ready |
| `getAppState(page)` | Get current app state from data layer |
| `resetDatabase(page)` | Clear all data via test endpoint |
| `seedDatabase()` | Reseed database with test fixtures |

## Authentication in Tests

The app requires authentication. Every test that interacts with the main page must call `loginAs` first.

```typescript
// Log in as a seed user (all use password "password123")
await loginAs(page, "alice");
```

**Session persistence:** Tests run sequentially in a shared browser context. A session cookie set by `loginAs` persists across navigations and reloads within the same test. You do not need to re-login after `page.reload()`.

**Testing unauthenticated flows:** The shared browser context means session cookies from earlier tests may leak into later ones. To test behavior for unauthenticated users, create a fresh browser context:

```typescript
test("unauthenticated user is redirected", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  // ... assertions about redirect ...
  await context.close();
});
```

Note: this test destructures `{ browser }` instead of `{ page }`.

## Test Isolation

Every test must be independent:

```typescript
test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
  await seedDatabase();
});
```

The `resetDatabase` and `seedDatabase` endpoints are excluded from authentication (the proxy does not protect `/api/test-utils/*`), so they work regardless of session state.

## Naming Conventions

- Test files: `e2e/{feature}.spec.ts`
- Describe blocks: feature area ("Send a message", "Login page")
- Test names: specific behavior being verified

## What NOT to Do

- Never use CSS selectors (`.class`, `#id`, `div > span`)
- Never depend on DOM structure or nesting
- Never assume channel/user ordering without explicitly selecting
- Never skip the Arrange step — always set up known state
- Never use `page.waitForTimeout()` — use semantic waiters instead
- Never use bare `getByRole("alert")` — Next.js injects a route announcer with `role="alert"`, so this resolves to multiple elements. Use `getByText` for error messages or narrow with `.filter()`

## Seed Data Reference

The seed script creates:

**Users:** alice, bob, charlie (IDs: user-alice, user-bob, user-charlie)
- All users have password: `password123`

**Channels:** empty, general, random (sorted alphabetically)
- empty: 0 members, 0 messages
- general: 3 members (alice, bob, charlie), 3 messages
- random: 2 members (alice, bob), 2 messages

**Important:** Channels are sorted alphabetically, so "empty" is the first/default channel.
