import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../../src/lib/env";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface TestUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

// Test user credentials
export const TEST_USER = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  email: "e2e-test-user-2025-unique@example.com",
  password: "secure-test-password-123!",
  username: "e2e-test-user",
  name: "E2E Test User",
};

// Test user configurations (templates for creating users)
export const TEST_USER_CONFIGS = {
  NEW_USER: {
    email: "e2e-test-user-2025-unique@example.com",
    password: "secure-test-password-123!",
    username: "e2e-test-user",
    name: "E2E Test User",
  },
  ONBOARDED_USER: {
    email: "e2e-onboarded-user-2025-unique@example.com",
    password: "secure-test-password-123!",
    username: "e2e-onboarded-user",
    name: "E2E Onboarded User",
  },
};

type TestUserConfig = (typeof TEST_USER_CONFIGS)[keyof typeof TEST_USER_CONFIGS];

interface EnsureTestUserOptions {
  isOnboarded?: boolean;
}

// Storage for created test users (will be populated during setup)
const createdUsers: Record<string, TestUser> = {};

// Create Supabase admin client for managing test users
export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Create Supabase client for regular operations
export function createSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Store a created user for later retrieval
export function storeCreatedUser(key: string, user: TestUser) {
  createdUsers[key] = user;
}

// Get a created user by key
export function getCreatedUser(key: string) {
  const user = createdUsers[key];
  if (!user) {
    throw new Error(`Test user ${key} not found. Make sure it was created during setup.`);
  }
  return user;
}

// Create or ensure test user exists using admin API
export async function ensureTestUserExists(userConfig: TestUserConfig, key?: string, options?: EnsureTestUserOptions) {
  const supabaseAdmin = createSupabaseAdminClient();
  const isOnboarded = options?.isOnboarded ?? false;

  try {
    // First, check if user already exists and delete them to start fresh
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.users.find((u) => u.email === userConfig.email);

    if (existingUser) {
      await setUserOnboardingState(existingUser.id, isOnboarded, userConfig.username);
      if (key) {
        storeCreatedUser(key, existingUser);
      }
      return existingUser;
    }

    // Now create the user fresh
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userConfig.email,
      password: userConfig.password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        full_name: userConfig.name,
        avatar_url: "https://github.com/images/error/testuser_happy.gif",
        preferred_username: userConfig.username,
        provider: "github",
        providers: ["github"],
      },
    });

    if (createError) {
      throw new Error(`Failed to create test user: ${(createError as Error).message}`);
    }

    console.log(`✅ Created test user ${userConfig.email} with ID: ${newUser.user?.id}`);
    const createdUser = newUser.user;
    if (!createdUser) {
      throw new Error("Test user creation succeeded but user data is missing");
    }
    await setUserOnboardingState(createdUser.id, isOnboarded, userConfig.username);

    // Store the created user for later use
    if (key) {
      storeCreatedUser(key, createdUser);
    }

    return createdUser;
  } catch (error) {
    console.error(`❌ Failed to ensure test user exists:`, error);
    throw error;
  }
}

// Generate a session token for a test user
export async function generateTestUserSession(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const supabaseClient = createSupabaseClient();

  try {
    // Get user details
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      throw new Error(`Test user not found: ${userId}`);
    }

    // Generate a magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });

    if (linkError || !linkData.properties) {
      throw new Error(`Failed to generate magic link: ${(linkError as Error)?.message}`);
    }

    // Extract the token hash from the action link URL or properties
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);

    // The admin API returns 'token' in URL params, but verifyOtp expects 'token_hash'
    // We can use either the 'token' from URL or 'hashed_token' from properties
    const tokenHash = url.searchParams.get("token") || linkData.properties.hashed_token;
    const type = url.searchParams.get("type");

    if (!tokenHash || !type) {
      console.error("❌ Could not extract token from magic link");
      console.error("❌ Action link URL:", actionLink);
      console.error("❌ URL search params:", Object.fromEntries(url.searchParams.entries()));
      console.error("❌ Properties:", linkData.properties);
      throw new Error("Could not extract token from magic link");
    }

    // Use the client to verify the OTP and get a real session
    const { data: verifyData, error: verifyError } = await supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });

    if (verifyError || !verifyData.session) {
      throw new Error(`Failed to verify OTP: ${(verifyError as Error)?.message}`);
    }

    return verifyData.session;
  } catch (error) {
    console.error("Failed to generate test user session:", error);
    throw error;
  }
}

// Set up authentication state in Playwright page
export async function setPageAuthentication(page: Page, session: Session) {
  console.log("🔐 Setting page authentication with session:", {
    access_token: session.access_token ? "present" : "missing",
    refresh_token: session.refresh_token ? "present" : "missing",
    user: session.user ? "present" : "missing",
  });

  // Get Supabase URL and key
  const { url: supabaseUrl, anonKey: supabaseKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }

  // Navigate to a page first to establish the browsing context
  await page.goto("/");

  // Create Supabase localStorage key
  const supabaseKeyName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

  // Set the session in localStorage for client-side Supabase client
  await page.evaluate(
    ({ sessionData, supabaseKeyName }) => {
      localStorage.setItem(supabaseKeyName, JSON.stringify(sessionData));
      console.log("🔐 Set localStorage key:", supabaseKeyName);
    },
    {
      sessionData: session,
      supabaseKeyName,
    }
  );

  // Set HTTP cookies that Playwright will send with requests to the Astro dev server
  // The middleware reads cookies via parseCookieHeader
  const sessionString = JSON.stringify(session);
  await page.context().addCookies([
    {
      name: supabaseKeyName,
      value: sessionString,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
    },
  ]);

  console.log("🔐 Set HTTP cookie and localStorage for middleware compatibility");
}

// Sign in a test user by creating session and setting auth state
export async function signInTestUser(page: Page, user: TestUser) {
  try {
    // Generate session using the actual user ID
    const session = await generateTestUserSession(user.id);

    // Profile should already exist from global setup
    // No need to create/update profile here

    // Set authentication state in page
    await setPageAuthentication(page, session);

    console.log(`✅ Signed in test user: ${user.email}`);
    return session;
  } catch (error) {
    console.error(`❌ Failed to sign in test user ${user.email}:`, error);
    throw error;
  }
}

// Clear authentication state
export async function clearAuthentication(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    // Clear all localStorage keys that might contain auth tokens
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("auth-token") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    });
  });
}

// Update user onboarding state in database
export async function setUserOnboardingState(userId: string, isOnboarded: boolean, username?: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // First, check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, is_onboarded, username")
      .eq("id", userId)
      .single();

    if (existingProfile && !checkError) {
      console.log(`🔍 Profile already exists for user ${userId}, updating...`);

      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update({
          is_onboarded: isOnboarded,
          ...(username && { username }),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Failed to update existing profile:", updateError);
      } else {
        console.log(`✅ Updated existing profile for user ${userId}`);
      }
      return;
    }

    // Profile doesn't exist, create it
    console.log(`🔧 Creating new user profile for ${userId}...`);

    const { error: insertError } = await supabaseAdmin.from("user_profiles").insert({
      id: userId,
      is_onboarded: isOnboarded,
      ...(username && { username }),
    });

    if (insertError) {
      console.error("Failed to create profile:", insertError);
      console.warn("⚠️  Continuing without user profile - this may cause authentication issues");
    } else {
      console.log(`✅ Created new profile for user ${userId}`);
    }
  } catch (error) {
    console.error("Failed to set user onboarding state:", error);
    console.warn("⚠️  Continuing without user profile - this may cause authentication issues");
  }
}

// Get user onboarding state
export async function getUserOnboardingState(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const { data, error } = await supabaseAdmin.from("user_profiles").select("is_onboarded").eq("id", userId).single();

    if (error) {
      // If profile doesn't exist, user is not onboarded
      return false;
    }

    return data?.is_onboarded ?? false;
  } catch (error) {
    console.error("Failed to get user onboarding state:", error);
    return false;
  }
}

// Update onboarding state for existing profile (for test scenarios)
export async function updateUserOnboardingState(userId: string, isOnboarded: boolean) {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const { error } = await supabaseAdmin.from("user_profiles").update({ is_onboarded: isOnboarded }).eq("id", userId);

    if (error) {
      console.error("Failed to update user onboarding state:", error);
      throw error;
    }

    console.log(`✅ Updated onboarding state for user ${userId}: is_onboarded = ${isOnboarded}`);
  } catch (error) {
    console.error("Failed to update user onboarding state:", error);
    throw error;
  }
}

// Clean up test users (used in teardown)
export async function cleanupTestUsers() {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // Get all users and find test users by email pattern
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();

    const testUsers = users.users.filter(
      (u) => u.email?.includes("e2e-test-user") || u.email?.includes("e2e-onboarded-user")
    );

    for (const user of testUsers) {
      try {
        // Delete user via Admin API (this cascades to profiles and related data)
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        console.log(`✅ Cleaned up test user: ${user.email}`);
      } catch (error) {
        console.warn(`⚠️  Could not delete test user ${user.email}:`, (error as Error).message);
      }
    }
  } catch (error) {
    console.error("Failed to cleanup test users:", error);
    // Don't throw - cleanup failures shouldn't break tests
  }
}
