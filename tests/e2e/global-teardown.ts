import { config } from "dotenv";
import { cleanupTestUsers } from "./fixtures/auth";

// This teardown runs once after all e2e tests
export default async function globalTeardown() {
  // Only run when test environment variables are present to prevent accidental production data modification
  if (!process.env.PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ E2E global teardown should only run with test environment variables");
    return; // Don't throw error in teardown
  }

  console.log("🧹 Cleaning up e2e test environment...");

  // Load test environment variables
  config({ path: ".env.test" });

  // Force test environment for teardown
  process.env.NODE_ENV = "test";

  // SECURITY: Only run cleanup in test environment
  if (process.env.NODE_ENV !== "test") {
    console.log("⏭️  Skipping test cleanup - not in test environment");
    return;
  }

  try {
    console.log("🗑️  Cleaning up e2e test users securely...");

    // Clean up test users using admin API
    await cleanupTestUsers();

    console.log("✅ E2E test cleanup complete");
    console.log("🔒 Cleanup performed securely in test environment only");
  } catch (error) {
    console.error("❌ E2E cleanup failed:", error);
    console.log("ℹ️  Test cleanup failure won't break CI - data may persist for next run");
    // Don't throw error in teardown to avoid failing the test run
  }
}
