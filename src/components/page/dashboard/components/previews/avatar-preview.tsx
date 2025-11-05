import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarPreviewProps {
  avatar_url?: string;
}

export function AvatarPreview({ avatar_url }: AvatarPreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-2">
        Avatar
      </Badge>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar_url} alt="Avatar" />
          <AvatarFallback>Avatar</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {avatar_url && avatar_url.startsWith("data:") && (
            <p className="text-xs text-muted-foreground mt-1">
              Local upload • {(avatar_url.length / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
