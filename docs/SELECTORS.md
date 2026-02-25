# Selector Strategy

## Priority Order

When writing Playwright tests, use selectors in this priority order:

1. **a11y / semantic selectors** (always preferred)
2. **data-testid** (fallback when a11y is ambiguous)
3. **Text content** (acceptable for unique visible text)
4. **CSS selectors** (never — these are fragile and couple tests to implementation)

## a11y Selector Patterns

Use Playwright's built-in locator methods that map to accessibility semantics:

| Method | Use for | Example |
|--------|---------|---------|
| `getByRole` | Interactive elements | `getByRole('button', { name: 'Send message' })` |
| `getByLabel` | Form inputs | `getByLabel('Username')`, `getByLabel('Password')` |
| `getByText` | Visible text content | `getByText('No messages in #empty yet')` |
| `getByRole('log')` | Message containers | `getByRole('log', { name: /Messages in/ })` |
| `getByRole('option')` | Channel selection | `getByRole('option').filter({ hasText: 'general' })` |
| `getByRole('article')` | Individual messages | `getByRole('article', { name: 'Message from alice' })` |
| `getByRole('status')` | Status messages | `getByRole('status', { name: 'No messages' })` |
| `getByRole('heading')` | Page/section titles | `getByRole('heading', { name: 'Sign in' })` |
| `getByRole('link')` | Navigation links | `getByRole('link', { name: 'Register' })` |

### Known ambiguity: `role="alert"`

Next.js injects a hidden route announcer element with `role="alert"` (`#__next-route-announcer__`). This means `getByRole("alert")` will resolve to multiple elements if your page also uses `role="alert"`. Prefer `getByText` for error messages instead.

## aria Attribute Conventions

Components use aria attributes consistently:

**Navigation landmarks:**
- `aria-label="Sidebar"` on the aside element
- `aria-label="Chat area"` on the main element
- `aria-label="Channels"` on the channel nav

**Interactive elements:**
- Buttons: `aria-label` describes the action ("Send message", "Sign in")
- Options: `aria-selected` reflects current channel

**Content regions:**
- Message list: `role="log"` with `aria-label="Messages in {channelName}"`
- Empty state: `role="status"` with `aria-label="No messages"`
- Individual messages: `role="article"` with `aria-label="Message from {username}"`

**Auth pages (login, register):**
- Form inputs use `<label htmlFor="...">` so `getByLabel` works
- Error messages use `role="alert"` on a `<p>` element — but use `getByText` to select them (see ambiguity note above)
- Submit buttons are standard `<button type="submit">`

## data-testid Convention

When a11y selectors are ambiguous, use `data-testid` with this format:

```
[layer]-[component]-[element]
```

Examples:
- `data-testid="ui-message-list"` — the message list container
- `data-testid="ui-send-button"` — the send button (if aria-label were ambiguous)
- `data-testid="ui-channel-item-general"` — specific channel in the list

Currently, data-testid is not needed — all elements are uniquely addressable via a11y selectors. This convention exists for future use when the UI becomes more complex.
