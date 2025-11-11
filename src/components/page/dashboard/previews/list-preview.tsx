import { Badge } from "@/components/ui/badge";

interface ListPreviewProps {
  items?: unknown[];
}

export function ListPreview({ items }: ListPreviewProps) {
  const itemCount = items?.length || 0;

  return (
    <div>
      <Badge variant="outline" className="mb-4">
        List
      </Badge>
      <p className="text-xs text-muted-foreground">
        {itemCount} link{itemCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
