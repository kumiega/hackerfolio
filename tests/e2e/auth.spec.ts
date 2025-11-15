import { test, expect } from "@playwright/test";
import { signInTestUser, ensureTestUserExists, TEST_USER_CONFIGS } from "./fixtures/auth";
import { expectToBeOnPage, expectElementVisible } from "./utils";

test.describe("Authentication Flow", () => {
  test("should load signin page", async ({ page }) => {
    await page.goto("/signin");
    await expect(page).toHaveTitle(/Hackerfolio/);

    // Check that the signin form is visible
    await expectElementVisible(page, 'form[aria-label="GitHub sign in form"]');
    await expectElementVisible(page, 'button[aria-label="Sign in with GitHub"]');
  });

  test("should authenticate user successfully and redirect to onboarding", async ({ page }) => {
    // Create test user for this test
    const testUser = await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER);

    // First, test that we can access a public page
    await page.goto("/");
    await expectToBeOnPage(page, /\//);

    // Sign in as test user (profile already exists from global setup with is_onboarded = false)
    const session = await signInTestUser(page, testUser);

    // Verify session was created successfully
    expect(session).toBeDefined();
    expect(session.access_token).toBeDefined();
    expect(session.user).toBeDefined();

    // Navigate to dashboard - since user is not onboarded, should redirect to onboarding
    await page.goto("/dashboard");

    // Should be redirected to onboarding (user profile has is_onboarded = false)
    await expectToBeOnPage(page, /\/onboarding/);
  });

  test("should persist authentication state across page reloads", async ({ page }) => {
    // Create test user for this test
    const testUser = await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER);

    // Sign in as test user
    await signInTestUser(page, testUser);
    await page.goto("/dashboard");
    await expectToBeOnPage(page, /\/(dashboard|onboarding)/);

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expectToBeOnPage(page, /\/(dashboard|onboarding)/);
  });

  test("should handle authentication cleanup", async ({ page }) => {
    // Create test user for this test
    const testUser = await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER);

    // Sign in as test user
    await signInTestUser(page, testUser);
    await page.goto("/dashboard");
    await expectToBeOnPage(page, /\/(dashboard|onboarding)/);

    // Clear authentication by clearing browser storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      // Clear all Supabase-related localStorage keys
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("auth-token") || key.includes("supabase")) {
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
    // Create test user for this test
    const testUser = await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER);

    // First session
    await signInTestUser(page, testUser);
    await page.goto("/dashboard");
    await expectToBeOnPage(page, /\/(dashboard|onboarding)/);

    // Clear session
    await page.context().clearCookies();
    await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("auth-token") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });
    });

    // Second session with same user
    await signInTestUser(page, testUser);
    await page.goto("/dashboard");
    await expectToBeOnPage(page, /\/(dashboard|onboarding)/);
  });
});
