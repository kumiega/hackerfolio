import { Badge } from "@/components/ui/badge";

interface FullNamePreviewProps {
  full_name?: string;
}

export function FullNamePreview({ full_name }: FullNamePreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-2">
        Full Name
      </Badge>
      <p className="text-sm text-muted-foreground">{full_name || "No name set"}</p>
    </div>
  );
}
