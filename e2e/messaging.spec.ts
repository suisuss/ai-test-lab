import { test, expect } from "@playwright/test";
import {
  getAppState,
  resetDatabase,
  seedDatabase,
  getComponentTree,
  findComponent,
  selectUser,
  selectChannel,
  sendTestMessage,
  waitForMessages,
} from "./helpers";

/**
 * REFERENCE TESTS
 *
 * These tests demonstrate the conventions for AI-assisted test development.
 *
 * Convention 1: Selector priority
 *   - Primary: a11y selectors (getByRole, getByLabel, getByText)
 *   - Fallback: data-testid (only when a11y is ambiguous)
 *   - Never: CSS selectors, DOM structure queries
 *
 * Convention 2: Assertion layers
 *   - DOM assertions: verify what the user sees
 *   - State assertions: verify the data layer via getAppState()
 *   - Structure assertions: verify component tree via getComponentTree() (experimental)
 *
 * Convention 3: Test structure
 *   - Arrange: set up preconditions (seed DB, select user/channel)
 *   - Act: perform the user action
 *   - Assert: verify outcomes at multiple layers
 *
 * Convention 4: Test isolation
 *   - Each test resets and reseeds the database
 *   - No test depends on another test's side effects
 */

test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
  await seedDatabase();
});

test.describe("Send a message", () => {
  test("user can send a message and see it appear in the channel", async ({
    page,
  }) => {
    // Arrange: navigate, select user, select general channel
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act: send a new message
    await sendTestMessage(page, "Hello from the test!");

    // Assert (DOM): the new message appears in the message log
    await expect(
      page.getByText("Hello from the test!")
    ).toBeVisible();

    // Assert (DOM): message shows correct sender
    const newMessage = page
      .getByRole("article", { name: "Message from alice" })
      .filter({ hasText: "Hello from the test!" });
    await expect(newMessage).toBeVisible();

    // Assert (State): the data layer reflects the new message
    const state = await getAppState(page);
    const general = state.channels.find((c) => c.name === "general");
    expect(general?.messageCount).toBe(4); // 3 seeded + 1 new
  });
});

test.describe("Switch channels", () => {
  test("switching channels updates the message list", async ({ page }) => {
    // Arrange: navigate, select general channel
    await page.goto("/");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Verify general channel messages are showing
    await expect(
      page.getByText("Hey everyone, welcome to the general channel!")
    ).toBeVisible();

    // Act: switch to random channel
    await selectChannel(page, "random");

    // Assert (DOM): random channel messages appear
    await expect(
      page.getByText("Anyone seen any good movies lately?")
    ).toBeVisible();
    await expect(
      page.getByText("I watched Dune Part Two, highly recommend it.")
    ).toBeVisible();

    // Assert (DOM): general channel messages are gone
    await expect(
      page.getByText("Hey everyone, welcome to the general channel!")
    ).not.toBeVisible();

    // Assert (DOM): channel header updated
    await expect(
      page.getByRole("heading", { name: /random/ })
    ).toBeVisible();
  });
});

test.describe("Message persistence", () => {
  test("sent message persists after page reload", async ({ page }) => {
    // Arrange: select channel, send a message
    await page.goto("/");
    await selectUser(page, "bob");
    await selectChannel(page, "general");
    await waitForMessages(page);
    await sendTestMessage(page, "This should persist");
    await expect(page.getByText("This should persist")).toBeVisible();

    // Act: reload the page and navigate back to same channel
    await page.reload();
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Assert (DOM): message is still there
    await expect(page.getByText("This should persist")).toBeVisible();

    // Assert (State): data layer confirms persistence
    const state = await getAppState(page);
    expect(state.totalMessages).toBe(6); // 5 seeded + 1 new
  });
});

test.describe("Empty channel", () => {
  test("empty channel shows appropriate empty state", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act: navigate to the empty channel
    await selectChannel(page, "empty");

    // Assert (DOM): empty state message is visible
    await expect(
      page.getByRole("status", { name: "No messages" })
    ).toBeVisible();
    await expect(
      page.getByText(/No messages in #empty yet/)
    ).toBeVisible();

    // Assert (State): data layer confirms zero messages
    const state = await getAppState(page);
    const empty = state.channels.find((c) => c.name === "empty");
    expect(empty?.messageCount).toBe(0);
  });
});

test.describe("Component tree inspection", () => {
  test("can find application components in the React fiber tree", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act: get the component tree
    const tree = await getComponentTree(page);

    // Assert: tree is available
    expect(tree).not.toBeNull();

    // Assert: application components are present
    const home = findComponent(tree, "Home");
    const messageList = findComponent(tree, "MessageList");
    const channelList = findComponent(tree, "ChannelList");
    const userSelector = findComponent(tree, "UserSelector");

    expect(home).not.toBeNull();
    expect(messageList).not.toBeNull();
    expect(channelList).not.toBeNull();
    expect(userSelector).not.toBeNull();

    // Assert: UserSelector has the expected props
    expect(userSelector!.props).toHaveProperty("users");
    expect(userSelector!.props).toHaveProperty("currentUserId");

    // Assert: MessageList has channel name prop
    expect(messageList!.props).toHaveProperty("channelName", "general");
  });
});
