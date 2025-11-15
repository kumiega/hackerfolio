import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Section } from "@/types";
import { ComponentPreview } from "./previews/component-preview";

interface DragOverlayContentProps {
  activeId: string | null;
  sections: Section[];
}

export function DragOverlayContent({ activeId, sections }: DragOverlayContentProps) {
  if (!activeId) return null;

  // Check if it's a section
  const draggedSection = sections.find((section) => section.id === activeId);
  if (draggedSection) {
    return (
      <Card className="shadow-2xl opacity-95 rotate-2 scale-105 border-2 border-primary/50 cursor-grabbing">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{draggedSection.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{draggedSection.components.length} components</p>
        </CardContent>
      </Card>
    );
  }

  // Check if it's a component
  for (const section of sections) {
    const draggedComponent = section.components.find((component) => component.id === activeId);
    if (draggedComponent) {
      return (
        <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-2xl opacity-95 rotate-1 scale-105 cursor-grabbing">
          <ComponentPreview component={draggedComponent} />
        </div>
      );
    }
  }

  return null;
}
