import { Badge } from "@/components/ui/badge";

interface BioPreviewProps {
  headline?: string;
}

export function BioPreview({ headline }: BioPreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-4">
        Bio
      </Badge>
      <p className="text-xs text-muted-foreground">{headline || "No headline"}</p>
    </div>
  );
}
