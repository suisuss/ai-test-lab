import { test, expect } from "@playwright/test";
import {
  getAppState,
  resetDatabase,
  seedDatabase,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetDatabase(page);
  await seedDatabase();
});

test.describe("Login page", () => {
  test("renders login form with all expected elements", async ({ page }) => {
    // Arrange & Act: navigate to login page
    await page.goto("/");

    // Assert (DOM): page heading
    await expect(
      page.getByRole("heading", { name: "Sign in" })
    ).toBeVisible();

    // Assert (DOM): form fields are present and labeled
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();

    // Assert (DOM): register link is present
    await expect(
      page.getByRole("link", { name: "Register" })
    ).toBeVisible();
  });

  test("successful login redirects to the chat page", async ({ page }) => {
    // Arrange: navigate to login page
    await page.goto("/");

    // Act: fill in valid credentials and submit
    await page.getByLabel("Username").fill("alice");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Assert: redirected to chat page
    await page.waitForURL("/chat");

    // Assert (DOM): chat page elements are visible
    await expect(
      page.getByRole("heading", { name: "ai-test-lab" })
    ).toBeVisible();

    // Assert (DOM): logged-in username is displayed
    await expect(page.getByText("alice")).toBeVisible();

    // Assert (State): seed data is intact
    const state = await getAppState(page);
    expect(state.users).toHaveLength(3);
  });

  test("invalid credentials show an error message", async ({ page }) => {
    // Arrange: navigate to login page
    await page.goto("/");

    // Act: fill in wrong password and submit
    await page.getByLabel("Username").fill("alice");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Assert (DOM): error message is visible
    await expect(
      page.getByText("Invalid username or password")
    ).toBeVisible();

    // Assert: still on login page (no redirect)
    expect(page.url()).not.toContain("/chat");
  });

  test("nonexistent username shows an error message", async ({ page }) => {
    // Arrange: navigate to login page
    await page.goto("/");

    // Act: fill in a username that doesn't exist
    await page.getByLabel("Username").fill("nobody");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Assert (DOM): error message is visible
    await expect(
      page.getByText("Invalid username or password")
    ).toBeVisible();
  });

  test("unauthenticated user visiting /chat is redirected to login", async ({
    browser,
  }) => {
    // Arrange: create a fresh browser context with no cookies/session
    const context = await browser.newContext();
    const page = await context.newPage();

    // Act: navigate directly to the chat page without logging in
    await page.goto("/chat");

    // Assert: redirected to login page
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page.getByLabel("Username")).toBeVisible();

    await context.close();
  });

  test("register link navigates to the registration page", async ({
    page,
  }) => {
    // Arrange: navigate to login page
    await page.goto("/");

    // Act: click the register link
    await page.getByRole("link", { name: "Register" }).click();

    // Assert: navigated to register page
    await page.waitForURL("/register");
    await expect(
      page.getByRole("heading", { name: "Register" })
    ).toBeVisible();
  });
});
