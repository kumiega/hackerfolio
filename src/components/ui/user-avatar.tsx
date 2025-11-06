import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/types";

interface UserAvatarProps {
  user: User | null;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function UserAvatar({ user, isLoading = false, size = "md", showText = true }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-left">
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

  if (!user) {
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

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 text-left">
      <Avatar className={`${sizeClasses[size]} rounded-lg`}>
        {user?.avatar_url && (
          <AvatarImage src={user.avatar_url} alt="" className={`${sizeClasses[size]} rounded-lg object-cover`} />
        )}
        <AvatarFallback className="rounded-lg">{user?.username?.[0]}</AvatarFallback>
      </Avatar>
      {showText && <span className="font-mono text-sm">{user?.username}</span>}
    </div>
  );
}
