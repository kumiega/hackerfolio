import { config } from "dotenv";
import { ensureTestUserExists, TEST_USER_CONFIGS } from "./fixtures/auth";

// This setup runs once before all e2e tests
export default async function globalSetup() {
  // Load test environment variables first
  config({ path: ".env.test" });

  // Only run when test environment variables are present to prevent accidental production data modification
  if (!process.env.PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("E2E setup attempted without test environment");
  }

  // Load test environment variables
  config({ path: ".env.test" });

  // Force test environment for setup
  process.env.NODE_ENV = "test";

  // SECURITY: Only run user setup in test environment to prevent production data corruption
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  try {
    // Create test users and store them for later use
    await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER, "NEW_USER", { isOnboarded: false });

    await ensureTestUserExists(TEST_USER_CONFIGS.ONBOARDED_USER, "ONBOARDED_USER", { isOnboarded: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ E2E setup failed:", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : "No stack",
    });
    throw error;
  }
}
