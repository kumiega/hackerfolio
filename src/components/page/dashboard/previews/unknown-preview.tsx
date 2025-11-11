import { Badge } from "@/components/ui/badge";

interface UnknownPreviewProps {
  type?: string;
}

export function UnknownPreview({ type }: UnknownPreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-4">
        {type || "Unknown"}
      </Badge>
      <p className="text-xs text-muted-foreground">Component</p>
    </div>
  );
}
