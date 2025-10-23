import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthSessionDto } from "@/types";

interface UserAvatarProps {
  session: AuthSessionDto | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function UserAvatar({ session, isLoading = false, size = "md", showText = true }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-1 py-1.5 text-left">
        <div className={`${sizeClasses[size]} bg-muted animate-pulse rounded-lg`} />
        {showText && (
          <div className="grid flex-1 text-left leading-tight">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded mt-1" />
          </div>
        )}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 px-1 py-1.5 text-left">
        <Avatar className={`${sizeClasses[size]} rounded-lg`}>
          <AvatarFallback className="rounded-lg">?</AvatarFallback>
        </Avatar>
        {showText && (
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium">Not authenticated</span>
            <span className="truncate text-xs">Please log in</span>
          </div>
        )}
      </div>
    );
  }

  const initials = session.profile.username
    ? session.profile.username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session.user.email
        .split("@")[0]
        .split(".")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

  const displayName = session.profile.username || session.user.email.split("@")[0];

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 text-left">
      <Avatar className={`${sizeClasses[size]} rounded-lg`}>
        {session.profile.avatar_url && (
          <AvatarImage
            src={session.profile.avatar_url}
            alt={displayName}
            className={`${sizeClasses[size]} rounded-lg object-cover`}
          />
        )}
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      {showText && (
        <div className="grid flex-1 text-left leading-tight">
          <span className={`truncate font-medium ${textSizeClasses[size]}`}>{displayName}</span>
          <span className="truncate text-xs">{session.user.email}</span>
        </div>
      )}
    </div>
  );
}
