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
 * Select a user by clicking their button in the user selector.
 * Uses a11y selectors as primary strategy.
 */
export async function selectUser(page: Page, username: string) {
  await page.getByRole("radio", { name: `Log in as ${username}` }).click();
}

/**
 * Select a channel by clicking it in the channel list.
 * Waits for the messages GET response before returning.
 */
export async function selectChannel(page: Page, channelName: string) {
  const messagesLoaded = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/channels/") &&
      resp.url().endsWith("/messages") &&
      resp.request().method() === "GET" &&
      resp.status() === 200
  );

  await page
    .getByRole("option")
    .filter({ hasText: channelName })
    .click();

  await messagesLoaded;
}

/**
 * Send a message in the currently selected channel.
 * Waits for the POST response and the subsequent messages GET refetch.
 */
export async function sendTestMessage(page: Page, content: string) {
  const postDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/channels/") &&
      resp.url().endsWith("/messages") &&
      resp.request().method() === "POST"
  );
  const getDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/channels/") &&
      resp.url().endsWith("/messages") &&
      resp.request().method() === "GET"
  );

  await page.getByLabel(/Type a message/).fill(content);
  await page.getByRole("button", { name: "Send message" }).click();

  await postDone;
  await getDone;
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

/**
 * Pending request descriptor from the fetch tracker.
 */
type PendingRequest = {
  method: string;
  url: string;
  startedAt: number;
};

/**
 * Get the list of currently in-flight fetch requests.
 * Requires the fetch tracker to be installed (dev mode only).
 */
export async function getPendingRequests(page: Page): Promise<PendingRequest[]> {
  return page.evaluate(
    () => (window as any).__TEST_PENDING_REQUESTS__?.() ?? []
  );
}

/**
 * Wait until all in-flight fetch requests have completed.
 * Requires the fetch tracker to be installed (dev mode only).
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => (window as any).__TEST_NETWORK_IDLE__?.() === true,
    { timeout }
  );
}
