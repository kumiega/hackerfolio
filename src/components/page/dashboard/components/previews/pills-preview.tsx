import { Badge } from "@/components/ui/badge";

interface PillsPreviewProps {
  items?: string[];
}

export function PillsPreview({ items }: PillsPreviewProps) {
  const safeItems = items || [];

  return (
    <div className="flex flex-col items-start">
      <Badge variant="outline" className="mb-4">
        Pills
      </Badge>
      <div className="flex flex-wrap gap-0.5">
        {safeItems.slice(0, 3).map((item: string, index: number) => (
          <Badge key={index} variant="muted" className="text-[8px] px-1.5 py-0">
            {item}
          </Badge>
        ))}
        {safeItems.length > 3 && (
          <Badge variant="muted" className="text-[8px] px-1.5 py-0">
            +{safeItems.length - 3} more
          </Badge>
        )}
      </div>
    </div>
  );
}
