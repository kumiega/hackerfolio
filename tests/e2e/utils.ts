import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Common e2e test utilities

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function expectToBeOnPage(page: Page, expectedPath: string | RegExp) {
  await expect(page).toHaveURL(expectedPath);
}

export async function expectPageTitle(page: Page, expectedTitle: string | RegExp) {
  await expect(page).toHaveTitle(expectedTitle);
}

export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function expectElementNotVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeHidden();
}

export async function clickAndWait(page: Page, selector: string) {
  await page.locator(selector).click();
  await waitForPageLoad(page);
}

export async function fillAndSubmit(page: Page, selector: string, value: string) {
  await page.locator(selector).fill(value);
  await page.locator(selector).press("Enter");
}

// Navigation helpers
export async function navigateToSignIn(page: Page) {
  await page.goto("/signin");
  await expectToBeOnPage(page, /\/signin/);
}

export async function navigateToDashboard(page: Page) {
  await page.goto("/dashboard");
  await expectToBeOnPage(page, /\/dashboard/);
}

export async function navigateToOnboarding(page: Page) {
  await page.goto("/onboarding");
  await expectToBeOnPage(page, /\/onboarding/);
}

// Authentication helpers
export async function performSignIn(page: Page) {
  await navigateToSignIn(page);

  // Click the GitHub sign in button (this will be intercepted by mockGitHubOAuth)
  await page.locator('button[aria-label="Sign in with GitHub"]').click();

  // Should be redirected to dashboard or onboarding after successful auth
  await expectToBeOnPage(page, /\/(dashboard|onboarding)/);
}

export async function completeOnboarding(page: Page, username = "testuser") {
  await expectToBeOnPage(page, /\/onboarding/);

  // Fill in username
  await page.locator('input[name="username"]').fill(username);

  // Submit the form
  await clickAndWait(page, 'button[type="submit"]');

  // Should be redirected to dashboard after onboarding
  await expectToBeOnPage(page, /\/dashboard/);
}
