import { test, expect } from "@playwright/test";
import {
  selectUser,
  selectChannel,
  sendTestMessage,
  waitForMessages,
  getAppState,
  resetDatabase,
  seedDatabase,
  getComponentTree,
  findComponent,
  findAllComponents,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
  await seedDatabase();
});

test.describe("Sending multiple messages in sequence", () => {
  test("multiple messages from the same user appear in order", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act
    await sendTestMessage(page, "First message");
    await sendTestMessage(page, "Second message");
    await sendTestMessage(page, "Third message");

    // Assert (DOM)
    await expect(page.getByText("First message")).toBeVisible();
    await expect(page.getByText("Second message")).toBeVisible();
    await expect(page.getByText("Third message")).toBeVisible();

    // Assert (State): general starts with 3 messages, we added 3
    const state = await getAppState(page);
    const general = state.channels.find((c) => c.name === "general");
    expect(general?.messageCount).toBe(6);
    expect(state.totalMessages).toBe(8);
  });

  test("messages sent to different channels are counted separately", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");

    // Act: send to general
    await selectChannel(page, "general");
    await waitForMessages(page);
    await sendTestMessage(page, "General msg");

    // Act: send to random
    await selectChannel(page, "random");
    await waitForMessages(page);
    await sendTestMessage(page, "Random msg");

    // Assert (State)
    const state = await getAppState(page);
    const general = state.channels.find((c) => c.name === "general");
    const random = state.channels.find((c) => c.name === "random");
    expect(general?.messageCount).toBe(4);
    expect(random?.messageCount).toBe(3);
    expect(state.totalMessages).toBe(7);
  });
});

test.describe("User switching and message attribution", () => {
  test("messages are attributed to the user who sent them", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act: alice sends a message
    await selectUser(page, "alice");
    await sendTestMessage(page, "Hello from Alice");

    // Act: bob sends a message
    await selectUser(page, "bob");
    await sendTestMessage(page, "Hello from Bob");

    // Assert (DOM): both messages visible
    await expect(page.getByText("Hello from Alice")).toBeVisible();
    await expect(page.getByText("Hello from Bob")).toBeVisible();

    // Assert (DOM): message articles attributed correctly
    const aliceArticle = page.getByRole("article", {
      name: "Message from alice",
    });
    await expect(aliceArticle.filter({ hasText: "Hello from Alice" })).toBeVisible();

    const bobArticle = page.getByRole("article", {
      name: "Message from bob",
    });
    await expect(bobArticle.filter({ hasText: "Hello from Bob" })).toBeVisible();
  });

  test("switching users updates the selected user radio state", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Act: select alice
    await selectUser(page, "alice");

    // Assert
    await expect(
      page.getByRole("radio", { name: "Log in as alice" })
    ).toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Log in as bob" })
    ).not.toBeChecked();

    // Act: switch to bob
    await selectUser(page, "bob");

    // Assert
    await expect(
      page.getByRole("radio", { name: "Log in as bob" })
    ).toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Log in as alice" })
    ).not.toBeChecked();
  });
});

test.describe("State API correctness after operations", () => {
  test("state reflects seed data before any actions", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Assert (State)
    const state = await getAppState(page);
    expect(state.users).toHaveLength(3);
    expect(state.users.map((u) => u.username).sort()).toEqual([
      "alice",
      "bob",
      "charlie",
    ]);
    expect(state.channels).toHaveLength(3);
    expect(state.totalMessages).toBe(5);
  });

  test("state updates correctly after reset and reseed", async ({ page }) => {
    // Arrange: send a message to change state
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "general");
    await waitForMessages(page);
    await sendTestMessage(page, "Extra message");

    // Verify state changed
    let state = await getAppState(page);
    expect(state.totalMessages).toBe(6);

    // Act: reset and reseed
    await resetDatabase(page);
    await seedDatabase();

    // Assert: state is back to seed baseline
    state = await getAppState(page);
    expect(state.totalMessages).toBe(5);
  });

  test("state reflects zero data after reset without reseed", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");

    // Act
    await resetDatabase(page);

    // Assert
    const state = await getAppState(page);
    expect(state.totalMessages).toBe(0);
    expect(state.channels).toHaveLength(0);
    expect(state.users).toHaveLength(0);
  });
});

test.describe("Channel member counts", () => {
  test("seed data has correct member counts per channel", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Assert (State)
    const state = await getAppState(page);
    const empty = state.channels.find((c) => c.name === "empty");
    const general = state.channels.find((c) => c.name === "general");
    const random = state.channels.find((c) => c.name === "random");

    expect(empty?.memberCount).toBe(0);
    expect(general?.memberCount).toBe(3);
    expect(random?.memberCount).toBe(2);
  });

  test("channels are sorted alphabetically in state", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Assert (State)
    const state = await getAppState(page);
    const channelNames = state.channels.map((c) => c.name);
    expect(channelNames).toEqual(["empty", "general", "random"]);
  });
});

test.describe("Empty channel behavior", () => {
  test("empty channel shows no messages status", async ({ page }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "empty");
    await waitForMessages(page);

    // Assert (DOM)
    await expect(
      page.getByRole("status", { name: "No messages" })
    ).toBeVisible();
  });

  test("sending a message in empty channel transitions from empty state to message log", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "empty");
    await waitForMessages(page);

    // Verify empty state is shown initially
    await expect(
      page.getByRole("status", { name: "No messages" })
    ).toBeVisible();

    // Act
    await sendTestMessage(page, "Breaking the silence");

    // Assert (DOM): message log should appear with the new message
    await expect(page.getByText("Breaking the silence")).toBeVisible();

    // Assert (State)
    const state = await getAppState(page);
    const empty = state.channels.find((c) => c.name === "empty");
    expect(empty?.messageCount).toBe(1);
  });
});

test.describe("Component tree verification", () => {
  test("component tree contains expected top-level components", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act
    const tree = await getComponentTree(page);

    // Assert: key components exist in the tree
    expect(tree).not.toBeNull();
    const messageList = findComponent(tree, "MessageList");
    expect(messageList).not.toBeNull();

    const channelList = findComponent(tree, "ChannelList");
    expect(channelList).not.toBeNull();

    const userSelector = findComponent(tree, "UserSelector");
    expect(userSelector).not.toBeNull();
  });

  test("component tree reflects message list aria attributes for current channel", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Act
    const tree = await getComponentTree(page);

    // Assert: MessageList has aria attributes reflecting the current channel
    const messageList = findComponent(tree, "MessageList");
    expect(messageList).not.toBeNull();
    expect(messageList?.aria).toBeDefined();

    // Switch channel and verify the tree updates
    await selectChannel(page, "random");
    await waitForMessages(page);

    const treeAfter = await getComponentTree(page);
    const messageListAfter = findComponent(treeAfter, "MessageList");
    expect(messageListAfter).not.toBeNull();
  });
});

test.describe("Channel navigation", () => {
  test("selecting a channel updates the message log aria label", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");

    // Act: go to general
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Assert (DOM)
    await expect(
      page.getByRole("log", { name: /Messages in general/ })
    ).toBeVisible();

    // Act: switch to random
    await selectChannel(page, "random");
    await waitForMessages(page);

    // Assert (DOM)
    await expect(
      page.getByRole("log", { name: /Messages in random/ })
    ).toBeVisible();
  });

  test("selected channel has aria-selected attribute", async ({ page }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");

    // Act
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Assert
    const generalOption = page
      .getByRole("option")
      .filter({ hasText: "general" });
    await expect(generalOption).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Message input behavior", () => {
  test("message input label reflects the current channel", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/");
    await selectUser(page, "alice");

    // Act
    await selectChannel(page, "general");
    await waitForMessages(page);

    // Assert
    await expect(page.getByLabel("Type a message in general")).toBeVisible();

    // Act: switch channel
    await selectChannel(page, "random");
    await waitForMessages(page);

    // Assert
    await expect(page.getByLabel("Type a message in random")).toBeVisible();
  });
});
