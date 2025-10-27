/**
 * Authentication related data access functions
 */

import { repositories } from "@/lib/repositories";
import type { SessionDisplay } from "./types";

/**
 * Get current user session data for views
 *
 * @returns Promise<SessionDisplay | null> - Session data or null if not authenticated
 */
export async function getCurrentSession(): Promise<SessionDisplay | null> {
  try {
    const supabase = repositories.getSupabaseClient();

    // Use getUser() for security, with getSession() as fallback
    let user;
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser || !authUser.email) {
      // Fallback to getSession() if getUser() fails
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user || !session.user.email) {
        return null;
      }

      user = session.user;
    } else {
      user = authUser;
    }

    const profile = await repositories.userProfiles.findById(user.id);
    if (!profile) return null;

    const avatarUrl =
      user.user_metadata?.avatar_url && user.user_metadata?.avatar_url.trim() !== ""
        ? user.user_metadata?.avatar_url
        : null;

    return {
      user: {
        id: user.id,
        email: user.email || "",
      },
      profile: {
        id: profile.id,
        username: profile.username,
        avatar_url: avatarUrl,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        is_onboarded: profile.is_onboarded,
      },
    };
  } catch {
    return null;
  }
}
