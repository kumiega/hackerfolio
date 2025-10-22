import { forwardRef } from "react";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitHubLoginButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const GitHubLoginButton = forwardRef<HTMLButtonElement, GitHubLoginButtonProps>(
  ({ onClick, isLoading, disabled = false }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        size="lg"
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full"
        aria-label="Login with GitHub"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
        {isLoading ? "Connecting..." : "Login with GitHub"}
      </Button>
    );
  }
);

GitHubLoginButton.displayName = "GitHubLoginButton";

export default GitHubLoginButton;
