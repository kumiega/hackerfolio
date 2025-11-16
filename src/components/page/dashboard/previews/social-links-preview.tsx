import { Badge } from "@/components/ui/badge";

interface SocialLinksPreviewProps {
  data?: Record<string, unknown>;
}

export function SocialLinksPreview({ data }: SocialLinksPreviewProps) {
  const getLinks = (data?: Record<string, unknown>) => {
    const links: { platform: string; url: string }[] = [];

    if (!data) return links;

    if (data.github && typeof data.github === "string" && data.github.trim()) {
      links.push({ platform: "GitHub", url: data.github });
    }
    if (data.linkedin && typeof data.linkedin === "string" && data.linkedin.trim()) {
      links.push({ platform: "LinkedIn", url: data.linkedin });
    }
    if (data.x && typeof data.x === "string" && data.x.trim()) {
      links.push({ platform: "X (Twitter)", url: data.x });
    }

    // Add website links
    if (data.website && Array.isArray(data.website)) {
      data.website.forEach((site) => {
        if (
          site &&
          typeof site === "object" &&
          "name" in site &&
          "url" in site &&
          typeof site.name === "string" &&
          typeof site.url === "string" &&
          site.name.trim() &&
          site.url.trim()
        ) {
          links.push({ platform: site.name, url: site.url });
        }
      });
    }

    return links;
  };

  const links = getLinks(data);

  return (
    <div>
      <Badge variant="outline" className="mb-2">
        Social Links
      </Badge>
      {links.length > 0 ? (
        <div className="space-y-1">
          {links.map((link, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              <span className="font-medium">{link.platform}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No social links added</p>
      )}
    </div>
  );
}
