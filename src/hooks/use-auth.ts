import { useState, useEffect, useCallback, useRef } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { AuthSessionDto } from "@/types";
import { getCurrentSession } from "@/lib/dal/auth";

// Local types for login component state management
export interface LoginState {
  isLoading: boolean;
  error: LoginError | null;
  session: AuthSessionDto | null;
}

export interface LoginError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Custom hook for managing GitHub OAuth login state and interactions
 * Handles session fetching, auth state changes, and OAuth flow initiation
 */
export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [session, setSession] = useState<AuthSessionDto | null>(null);
  const initializedRef = useRef(false);

  /**
   * Fetches complete session data including profile from database
   */
  const fetchSessionData = useCallback(async (): Promise<AuthSessionDto | null> => {
    try {
      const sessionData = await AuthService.getCurrentSession();
      return sessionData;
    } catch {
      return null;
    }
  }, []);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sets a new error state
   */
  const setErrorState = useCallback((newError: LoginError | null) => {
    setError(newError);
  }, []);

  /**
   * Initiates GitHub OAuth login flow
   * Redirects user to GitHub for authorization
   */
  const handleGitHubLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        throw new Error(oauthError.message);
      }
    } catch (err) {
      const loginError: LoginError = {
        code: "OAUTH_ERROR",
        message: err instanceof Error ? err.message : "Failed to connect to GitHub. Please try again.",
        details: err instanceof Error ? err.stack : undefined,
      };
      setError(loginError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles user logout
   * Signs out the user and redirects to login page
   */
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: logoutError } = await supabaseClient.auth.signOut();

      if (logoutError) {
        throw new Error(logoutError.message);
      }

      // Redirect to login page after successful logout
      window.location.href = "/login";
    } catch (err) {
      const logoutError: LoginError = {
        code: "LOGOUT_ERROR",
        message: err instanceof Error ? err.message : "Failed to logout. Please try again.",
        details: err instanceof Error ? err.stack : undefined,
      };
      setError(logoutError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (currentSession?.user) {
          const sessionData = await fetchSessionData();
          setSession(sessionData);
        } else {
          setSession(null);
        }
      } catch (err) {
        if (!isMounted) return;

        const sessionError: LoginError = {
          code: "SESSION_FETCH_ERROR",
          message: "Unable to check session. Please refresh the page.",
          details: err instanceof Error ? err.message : undefined,
        };
        setError(sessionError);
        setSession(null);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const sessionData = await fetchSessionData();
        setSession(sessionData);
        setError(null);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setError(null);
      } else if (event === "TOKEN_REFRESHED") {
        if (session?.user) {
          const sessionData = await fetchSessionData();
          setSession(sessionData);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchSessionData]);

  return {
    isLoading,
    error,
    session,
    handleGitHubLogin,
    handleLogout,
    clearError,
    setError: setErrorState,
  };
}
