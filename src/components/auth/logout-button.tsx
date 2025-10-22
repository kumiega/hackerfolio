import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface LogoutButtonProps {
  variant?: "default" | "light" | "glass" | "dark" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  className?: string;
  children?: React.ReactNode;
}

export default function LogoutButton({
  variant = "ghost",
  size = "default",
  className,
  children = "Logout",
}: LogoutButtonProps) {
  const { isLoading, handleLogout } = useAuth();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
      aria-label="Logout from your account"
    >
      {isLoading ? "Logging out..." : children}
    </Button>
  );
}
