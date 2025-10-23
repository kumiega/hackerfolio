import { useState, useEffect } from "react";
import { SessionUtils } from "@/lib/session-utils";
import type { AuthSessionDto } from "@/types";

/**
 * React hook for checking authentication state
 * Provides real-time session information and loading states
 */
export function useSessionCheck() {
  const [session, setSession] = useState<AuthSessionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        setIsLoading(true);
        const currentSession = await SessionUtils.getCurrentSession();

        if (isMounted) {
          setSession(currentSession);
          setIsAuthenticated(!!currentSession);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        if (isMounted) {
          setSession(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    session,
    isLoading,
    isAuthenticated,
    userId: session?.user.id || null,
    userEmail: session?.user.email || null,
    
  };
}

/**
 * Simple hook that only returns authentication status
 * Lighter weight for basic auth checks
 */
export function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const hasSession = await SessionUtils.hasSession();
        if (isMounted) {
          setIsAuthenticated(hasSession);
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return isAuthenticated;
}
