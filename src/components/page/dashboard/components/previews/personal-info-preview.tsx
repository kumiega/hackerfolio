import { Badge } from "@/components/ui/badge";

interface PersonalInfoPreviewProps {
  full_name?: string;
  position?: string;
}

export function PersonalInfoPreview({ full_name, position }: PersonalInfoPreviewProps) {
  return (
    <div>
      <Badge variant="outline" className="mb-2">
        Personal Info
      </Badge>
      <div className="space-y-1">
        <p className="text-sm font-medium">{full_name || "No name set"}</p>
        {position && <p className="text-sm text-muted-foreground">{position}</p>}
      </div>
    </div>
  );
}
