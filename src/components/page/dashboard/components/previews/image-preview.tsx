import { Badge } from "@/components/ui/badge";

interface ImagePreviewProps {
  alt?: string;
}

export function ImagePreview({ alt }: ImagePreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-4">
        Image
      </Badge>
      <p className="text-xs text-muted-foreground">{alt || "Image"}</p>
    </div>
  );
}
