import { Badge } from "@/components/ui/badge";

interface CardData {
  repo_url: string;
  title: string;
  summary: string;
  tech: string[];
}

interface CardPreviewProps {
  cards?: CardData[];
}

export function CardPreview({ cards }: CardPreviewProps) {
  const safeCards = cards || [];

  if (safeCards.length === 0) {
    return (
      <div>
        <Badge variant="outline" className="mb-4">
          Project Card
        </Badge>
        <p className="text-xs text-muted-foreground">Card is empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <Badge variant="outline" className="mb-4">
        Project Card
      </Badge>
      <div className="space-y-2">
        {safeCards.slice(0, 3).map((card, index) => (
          <div key={index}>
            <h4 className="font-medium text-xs">{card.title || "Untitled"}</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">{card.summary || "No summary"}</p>
            {card.tech && card.tech.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {card.tech.slice(0, 3).map((tech, techIndex) => (
                  <Badge key={techIndex} variant="muted" className="text-[8px] px-1.5 py-0 tracking-widest">
                    {tech}
                  </Badge>
                ))}
                {card.tech.length > 3 && (
                  <Badge variant="muted" className="text-[8px] px-1.5 py-0 tracking-widest">
                    +{card.tech.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
