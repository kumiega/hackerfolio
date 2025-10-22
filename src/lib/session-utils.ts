import { supabaseClient } from "@/db/supabase.client";
import type { AuthSessionDto } from "@/types";

/**
 * Client-side session utilities for checking authentication state
 */
export class SessionUtils {
  /**
   * Checks if there's an active user session
   * @returns Promise<boolean> - True if user is authenticated
   */
  static async hasSession(): Promise<boolean> {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();
      return !error && !!session?.user;
    } catch {
      return false;
    }
  }

  /**
   * Gets the current user session data
   * @returns Promise<AuthSessionDto | null> - Session data or null if not authenticated
   */
  static async getCurrentSession(): Promise<AuthSessionDto | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session?.user) {
        return null;
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email || "",
        },
        profile: {
          id: session.user.id,
          username: null,
          created_at: session.user.created_at || "",
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Gets the current user ID
   * @returns Promise<string | null> - User ID or null if not authenticated
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();
      return !error && session?.user ? session.user.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Gets the current user email
   * @returns Promise<string | null> - User email or null if not authenticated
   */
  static async getCurrentUserEmail(): Promise<string | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();
      return !error && session?.user ? session.user.email : null;
    } catch {
      return null;
    }
  }

  /**
   * Waits for authentication state to be determined
   * Useful for initial page loads where you need to wait for auth state
   * @returns Promise<AuthSessionDto | null> - Session data or null
   */
  static async waitForAuth(): Promise<AuthSessionDto | null> {
    return new Promise((resolve) => {
      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
          subscription.unsubscribe();

          if (session?.user) {
            resolve({
              user: {
                id: session.user.id,
                email: session.user.email || "",
              },
              profile: {
                id: session.user.id,
                username: null,
                created_at: session.user.created_at || "",
              },
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }
}
