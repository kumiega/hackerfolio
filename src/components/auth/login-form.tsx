import { useEffect, useRef, useState } from "react";
import GitHubLoginButton from "./login-button";
import ErrorMessage from "./error-message";
import { useAuth } from "@/hooks/use-auth";

interface LoginFormProps {
  onLoginSuccess?: () => void;
  initialError?: string;
}

/**
 * Converts error codes from URL parameters to user-friendly messages
 */
function getErrorMessageFromCode(errorCode: string | null): string | null {
  switch (errorCode) {
    case "auth_callback_failed":
      return "Authentication failed. Please try logging in again.";
    case "access_denied":
      return "Access was denied. Please try again.";
    case "server_error":
      return "A server error occurred. Please try again later.";
    default:
      return null;
  }
}

export default function LoginForm({ initialError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { error, handleGitHubLogin, clearError, setError } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get("error");

    if (initialError || urlError) {
      const errorMessage = initialError || getErrorMessageFromCode(urlError);
      if (errorMessage) {
        setError({
          code: urlError || "initial_error",
          message: errorMessage,
        });
      }
    }
  }, [initialError, setError]);

  const handleLogin = async () => {
    setIsLoading(true);
    await handleGitHubLogin();
  };

  return (
    <form
      aria-label="GitHub login form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
    >
      <ErrorMessage error={error} onDismiss={clearError} />

      <GitHubLoginButton ref={buttonRef} onClick={handleLogin} isLoading={isLoading} disabled={isLoading} />
    </form>
  );
}
