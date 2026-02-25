import { type Page, expect } from "@playwright/test";

/**
 * Application state as returned by the test state endpoint.
 * This gives tests access to the ground truth of the data layer
 * without relying solely on DOM inspection.
 */
type AppState = {
  users: Array<{ id: string; username: string }>;
  channels: Array<{
    id: string;
    name: string;
    memberCount: number;
    messageCount: number;
  }>;
  totalMessages: number;
};

/**
 * Fetch the current application state from the test endpoint.
 * Use this to assert against the data layer directly.
 *
 * Example:
 *   const state = await getAppState(page);
 *   expect(state.totalMessages).toBe(6);
 */
export async function getAppState(page: Page): Promise<AppState> {
  const response = await page.request.get("/api/test-utils/state");
  expect(response.ok()).toBe(true);
  return response.json();
}

/**
 * Reset the database to empty state via the test endpoint.
 * Call this in beforeEach/afterEach to ensure test isolation.
 */
export async function resetDatabase(page: Page): Promise<void> {
  const response = await page.request.post("/api/test-utils/reset");
  expect(response.ok()).toBe(true);
}

/**
 * Seed the database by running the seed script.
 * This restores the standard test fixtures (3 users, 3 channels, 5 messages).
 */
export async function seedDatabase(): Promise<void> {
  const { execSync } = await import("child_process");
  execSync("pnpm db:seed", {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

/**
 * Serialized component tree node from the React fiber walker.
 */
type ComponentNode = {
  type: string;
  props: Record<string, unknown>;
  aria: Record<string, string>;
  children: ComponentNode[];
};

/**
 * Get the React component tree from the page.
 * This walks the React fiber tree and returns a simplified JSON representation.
 *
 * Example:
 *   const tree = await getComponentTree(page);
 *   const messageList = findComponent(tree, "MessageList");
 */
export async function getComponentTree(page: Page): Promise<ComponentNode | null> {
  return page.evaluate(() => {
    const fn = (window as any).__TEST_COMPONENT_TREE__;
    return typeof fn === "function" ? fn() : null;
  });
}

/**
 * Find a component by name in the serialized tree.
 * Returns the first match (depth-first search).
 */
export function findComponent(
  node: ComponentNode | null,
  name: string
): ComponentNode | null {
  if (!node) return null;
  if (node.type === name) return node;
  for (const child of node.children) {
    const found = findComponent(child, name);
    if (found) return found;
  }
  return null;
}

/**
 * Find all components by name in the serialized tree.
 */
export function findAllComponents(
  node: ComponentNode | null,
  name: string
): ComponentNode[] {
  if (!node) return [];
  const results: ComponentNode[] = [];
  if (node.type === name) results.push(node);
  for (const child of node.children) {
    results.push(...findAllComponents(child, name));
  }
  return results;
}

/**
 * Log in as a user via the login page.
 * Navigates to /login, fills credentials, submits, and waits for redirect.
 */
export async function loginAs(
  page: Page,
  username: string,
  password = "password123"
) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/**
 * Select a channel by clicking it in the channel list.
 */
export async function selectChannel(page: Page, channelName: string) {
  await page
    .getByRole("option")
    .filter({ hasText: channelName })
    .click();
}

/**
 * Send a message in the currently selected channel.
 */
export async function sendTestMessage(page: Page, content: string) {
  const input = page.getByLabel(/Type a message/);
  await input.fill(content);
  await page.getByRole("button", { name: "Send message" }).click();
}

/**
 * Wait for the message area to be ready (either messages loaded or empty state).
 */
export async function waitForMessages(page: Page) {
  // Wait for either the message log (has messages) or empty status (no messages)
  await page
    .locator('[role="log"], [role="status"][aria-label="No messages"]')
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
}

/**
 * Wait specifically for the message log with messages to appear.
 */
export async function waitForMessageLog(page: Page) {
  await page.getByRole("log").waitFor({ state: "visible", timeout: 10000 });
}
