import { Badge } from "@/components/ui/badge";

interface SocialLinksPreviewProps {
  data?: Record<string, unknown>;
}

export function SocialLinksPreview({ data }: SocialLinksPreviewProps) {
  const linkCount = data ? Object.keys(data).length : 0;

  return (
    <div>
      <Badge variant="outline" className="mb-4">
        Social Links
      </Badge>
      <p className="text-xs text-muted-foreground">
        {linkCount} social link{linkCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
