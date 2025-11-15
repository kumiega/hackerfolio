import { config } from "dotenv";
import { ensureTestUserExists, TEST_USER_CONFIGS } from "./fixtures/auth";

// This setup runs once before all e2e tests
export default async function globalSetup() {
  // Load test environment variables first
  config({ path: ".env.test" });

  // Only run when test environment variables are present to prevent accidental production data modification
  if (!process.env.PUBLIC_E2E_SUPABASE_URL && !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ E2E global setup should only run with test environment variables");
    throw new Error("E2E setup attempted without test environment");
  }

  console.log("🔧 Setting up e2e test environment...");

  // Load test environment variables
  config({ path: ".env.test" });

  // Force test environment for setup
  process.env.NODE_ENV = "test";

  // SECURITY: Only run user setup in test environment to prevent production data corruption
  if (process.env.NODE_ENV !== "test") {
    console.log("⏭️  Skipping test user setup - not in test environment");
    console.log("✅ E2E test environment setup complete (no-op in production)");
    return;
  }

  try {
    console.log("👤 Setting up e2e test users with Supabase Admin API...");

    // Create test users and store them for later use
    console.log("📧 Creating new test user...");
    await ensureTestUserExists(TEST_USER_CONFIGS.NEW_USER, "NEW_USER", { isOnboarded: false });
    console.log("✅ New user created");

    console.log("📧 Creating onboarded test user...");
    await ensureTestUserExists(TEST_USER_CONFIGS.ONBOARDED_USER, "ONBOARDED_USER", { isOnboarded: true });
    console.log("✅ Onboarded user created");

    console.log("✅ E2E test environment setup complete");
    console.log("🔒 All operations performed securely via Admin API in test environment only");
    console.log("📝 Test users and profiles ready for authentication testing");
  } catch (error) {
    console.error("❌ E2E setup failed:", error);
    console.error("🔍 This error only occurs in test environment - check Supabase Admin API access");
    throw error;
  }
}
