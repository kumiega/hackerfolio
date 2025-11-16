import { config } from "dotenv";
import { cleanupTestUsers } from "./fixtures/auth";

// This teardown runs once after all e2e tests
export default async function globalTeardown() {
  // Only run when test environment variables are present to prevent accidental production data modification
  if (!process.env.PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line no-console
    console.error("❌ E2E global teardown should only run with test environment variables");
    return; // Don't throw error in teardown
  }

  // Load test environment variables
  config({ path: ".env.test" });

  // Force test environment for teardown
  process.env.NODE_ENV = "test";

  // SECURITY: Only run cleanup in test environment
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  try {
    // Clean up test users using admin API
    await cleanupTestUsers();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ E2E cleanup failed:", error);
    // Don't throw error in teardown to avoid failing the test run
  }
}
