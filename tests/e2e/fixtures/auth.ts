import type { Page, APIRequestContext, Cookie } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { config } from "dotenv";

config({ path: ".env.test" });

const PUBLIC_SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const PUBLIC_SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function createAnonClient({
  request, // eslint-disable-line @typescript-eslint/no-unused-vars
  cookies,
  page,
}: {
  request: Request | APIRequestContext;
  cookies: AstroCookies | Cookie[];
  page?: Page;
}): ReturnType<typeof createServerClient> {
  // Handle Playwright types (cookies is an array)
  if (Array.isArray(cookies)) {
    const playwrightCookies = cookies as Cookie[];
    const cookieStore: Cookie[] = [...playwrightCookies];

    return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
      cookies: {
        getAll() {
          return cookieStore.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Update our in-memory cookie store
            const existingIndex = cookieStore.findIndex((c) => c.name === name);
            const cookie: Cookie = {
              name,
              value,
              domain: options?.domain || "localhost",
              path: options?.path || "/",
              expires: options?.expires ? Math.floor(new Date(options.expires).getTime() / 1000) : -1,
              httpOnly: options?.httpOnly || false,
              secure: options?.secure || false,
              sameSite: (options?.sameSite as "Strict" | "Lax" | "None") || "Lax",
            };

            if (existingIndex >= 0) {
              cookieStore[existingIndex] = cookie;
            } else {
              cookieStore.push(cookie);
            }

            // If we have a page context, also add to browser
            if (page) {
              page.context().addCookies([
                {
                  name,
                  value,
                  domain: options?.domain || "localhost",
                  path: options?.path || "/",
                  expires: options?.expires ? new Date(options.expires).getTime() / 1000 : undefined,
                  httpOnly: options?.httpOnly || false,
                  secure: options?.secure || false,
                  sameSite: (typeof options?.sameSite === "string" && options.sameSite.toLowerCase() === "strict"
                    ? "Strict"
                    : typeof options?.sameSite === "string" && options.sameSite.toLowerCase() === "none"
                      ? "None"
                      : "Lax") as "Strict" | "Lax" | "None",
                },
              ]);
            }
          });
        },
      },
    });
  }
}

export async function createTestUser(user: TestUser): Promise<string> {
  const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUser?.users.find((u) => u.email === user.email);

  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (error) throw error;

  return data.user.id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function loginUser(page: Page, user: TestUser): Promise<void> {
  const client = createAnonClient({
    request: page.context().request,
    cookies: await page.context().cookies(),
    page,
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) throw error;
  if (!data.session) throw new Error("Missing Supabase session");

  // Navigate to a page that will set the cookies properly
  await page.goto("/signin");

  // Inject the session directly via browser context
  await page.evaluate((session) => {
    // This will be picked up by your Supabase client
    localStorage.setItem("supabase.auth.token", JSON.stringify(session));
  }, data.session);

  // Reload to pick up the session
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Now navigate to dashboard
  await page.goto("/dashboard");
  // await page.context().storageState({ path: STORAGE_STATE_PATH });
}

export async function logoutUser(page: Page): Promise<void> {
  await page.context().clearCookies();
}

export async function setUserOnboardingState(userId: string, isOnboarded: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from("user_profiles").update({ is_onboarded: isOnboarded }).eq("id", userId);

  if (error) throw error;
}
