import { Badge } from "@/components/ui/badge";

interface TextPreviewProps {
  content?: string;
}

export function TextPreview({ content }: TextPreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-4">
        Text
      </Badge>
      <p className="text-xs text-muted-foreground line-clamp-2">{content || "No content"}</p>
    </div>
  );
}
