import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, loginUser, setUserOnboardingState } from "./fixtures/auth";
import { expectPageTitle, expectToBeOnPage } from "./utils";
import { TEST_USER } from "@/lib/const";

test.describe("Authentication Flow", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await createTestUser(TEST_USER);
  });

  test.afterAll(async () => {
    await deleteTestUser(userId);
  });

  test.afterEach(async () => {
    await setUserOnboardingState(userId, false);
  });

  test("unauthenticated user should be redirected to signin", async ({ page }) => {
    await page.goto("/dashboard");

    await expectToBeOnPage(page, /\/signin/);
    await expectPageTitle(page, /Sign in | Hackerfolio/);
    await expect(page.getByTestId("signin-page")).toBeVisible();
  });

  test("authenticated user should be redirected to dashboard", async ({ page }) => {
    await setUserOnboardingState(userId, true);
    await loginUser(page, TEST_USER);

    await expectToBeOnPage(page, /\/dashboard/);
    await expectPageTitle(page, "Dashboard | Hackerfolio");

    // Wait for React to hydrate and hide the skeleton
    await expect(page.locator("#dashboard-skeleton")).toHaveCSS("display", "none");
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });

  test("should authenticate user successfully and redirect to onboarding", async ({ page }) => {
    // Ensure user is not onboarded
    await setUserOnboardingState(userId, false);
    // Sign in as test user
    await loginUser(page, TEST_USER);
    // Should be redirected to onboarding since user is not onboarded
    await expectToBeOnPage(page, /\/onboarding/);
  });

  test("should persist authentication state across page reloads", async ({ page }) => {
    // Ensure user is onboarded
    await setUserOnboardingState(userId, true);
    // Sign in as test user (loginUser already navigates to dashboard)
    await loginUser(page, TEST_USER);
    await expectToBeOnPage(page, /\/dashboard/);
    // Reload the page
    await page.reload();
    // Should still be authenticated and on dashboard
    await expectToBeOnPage(page, /\/dashboard/);
  });

  test("should handle authentication cleanup", async ({ page }) => {
    // Ensure user is onboarded
    await setUserOnboardingState(userId, true);
    // Sign in as test user
    await loginUser(page, TEST_USER);
    await expectToBeOnPage(page, /\/dashboard/);
    // Clear authentication by clearing browser storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      // Clear all Supabase-related localStorage keys
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });
    });
    // Try to access protected route after clearing auth
    await page.goto("/dashboard");
    // Should be redirected to signin
    await expectToBeOnPage(page, /\/signin/);
  });

  test("should handle multiple authentication sessions", async ({ page }) => {
    // Ensure user is onboarded
    await setUserOnboardingState(userId, true);
    // First session
    await loginUser(page, TEST_USER);
    await expectToBeOnPage(page, /\/dashboard/);
    // Clear session
    await page.context().clearCookies();
    await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });
    });
    // Second session with same user
    await loginUser(page, TEST_USER);
    await expectToBeOnPage(page, /\/dashboard/);
  });
});
