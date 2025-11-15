import * as React from "react";
import { Edit3, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Component } from "@/types";

interface SortableComponentProps {
  component: Component;
  sectionId: string;
  children: React.ReactNode;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableComponent({ component, sectionId, children, onEdit, onDelete }: SortableComponentProps) {
  const [isPressed, setIsPressed] = React.useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: component.id,
    data: {
      type: "component",
      component,
      sectionId,
    },
    transition: {
      duration: 100,
      easing: "ease",
    },
  });

  // Clear pressed state when dragging starts
  React.useEffect(() => {
    if (isDragging) {
      setIsPressed(false);
    }
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-background border border-dashed border-primary p-3 py-5 mb-2 transition-all ${isDragging ? "opacity-50 bg-muted ring-2 ring-primary border-primary scale-[1.02]" : ""} ${isPressed && !isDragging ? "scale-[0.98]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent hover:text-accent-foreground active:bg-primary active:text-primary-foreground border-0 bg-transparent text-muted-foreground touch-none transition-colors rounded-md"
            aria-label={`Drag handle for ${component.type} component`}
            type="button"
            suppressHydrationWarning
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1">{children}</div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(component.id)}
            aria-label={`Edit ${component.type} component`}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(component.id)}
            aria-label={`Delete ${component.type} component`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
