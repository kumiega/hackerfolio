import { Badge } from "@/components/ui/badge";
import type { Component } from "@/types";

interface ComponentPreviewProps {
  component: Component;
}

export function ComponentPreview({ component }: ComponentPreviewProps) {
  switch (component.type) {
    case "text":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Text
          </Badge>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {(component.data as { content: string }).content || "No content"}
          </p>
        </div>
      );
    case "card":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Project Card
          </Badge>
          <h4 className="font-medium text-sm">{(component.data as { title: string }).title || "Untitled"}</h4>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {(component.data as { summary: string }).summary || "No summary"}
          </p>
        </div>
      );
    case "pills":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Skills
          </Badge>
          <div className="flex flex-wrap gap-1">
            {((component.data as { items: string[] }).items || []).slice(0, 3).map((item: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
            {((component.data as { items: string[] }).items || []).length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{((component.data as { items: string[] }).items || []).length - 3} more
              </Badge>
            )}
          </div>
        </div>
      );
    case "social_links":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Social Links
          </Badge>
          <p className="text-sm text-muted-foreground">Social media links</p>
        </div>
      );
    case "list":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Links
          </Badge>
          <p className="text-sm text-muted-foreground">
            {((component.data as { items: unknown[] }).items || []).length} links
          </p>
        </div>
      );
    case "image":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Image
          </Badge>
          <p className="text-sm text-muted-foreground">{(component.data as { alt: string }).alt || "Image"}</p>
        </div>
      );
    case "bio":
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            Bio
          </Badge>
          <p className="text-sm text-muted-foreground">
            {(component.data as { headline: string }).headline || "No headline"}
          </p>
        </div>
      );
    default:
      return (
        <div>
          <Badge variant="outline" className="mb-2">
            {component.type}
          </Badge>
          <p className="text-sm text-muted-foreground">Component</p>
        </div>
      );
  }
}
