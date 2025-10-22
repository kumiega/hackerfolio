import { useSessionCheck } from "@/hooks/useSessionCheck";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Component that conditionally renders content based on authentication state
 *
 * @param children - Content to render when condition is met
 * @param fallback - Content to render when condition is not met (default: null)
 * @param requireAuth - If true, shows children only when authenticated. If false, shows children only when not authenticated
 * @param loadingComponent - Component to show while checking authentication state
 */
export default function AuthGuard({
  children,
  fallback = null,
  requireAuth = true,
  loadingComponent = <div className="animate-pulse bg-muted h-4 w-32 rounded"></div>,
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useSessionCheck();

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  const shouldShow = requireAuth ? isAuthenticated : !isAuthenticated;

  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders children when user is authenticated
 */
export function AuthenticatedOnly({ children, fallback, loadingComponent }: Omit<AuthGuardProps, "requireAuth">) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback} loadingComponent={loadingComponent}>
      {children}
    </AuthGuard>
  );
}

/**
 * Component that only renders children when user is NOT authenticated
 */
export function UnauthenticatedOnly({ children, fallback, loadingComponent }: Omit<AuthGuardProps, "requireAuth">) {
  return (
    <AuthGuard requireAuth={false} fallback={fallback} loadingComponent={loadingComponent}>
      {children}
    </AuthGuard>
  );
}
