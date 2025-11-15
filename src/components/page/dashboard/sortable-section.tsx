import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Section } from "@/types";

interface SortableSectionProps {
  section: Section;
  children: React.ReactNode;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onAddComponent: (sectionId: string) => void;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
}

export function SortableSection({
  section,
  children,
  onToggleVisibility,
  onDelete,
  onAddComponent,
  onUpdateSection,
}: SortableSectionProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(section.title);
  const [isPressed, setIsPressed] = useState(false);
  const editContainerRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: {
      type: "section",
      section,
    },
    transition: {
      duration: 100,
      easing: "ease",
    },
  });

  // Clear pressed state when dragging starts (handled in render)
  const effectiveIsPressed = isPressed && !isDragging;

  const handleTitleSave = useCallback(() => {
    if (editingTitle.trim() && editingTitle !== section.title) {
      onUpdateSection(section.id, {
        title: editingTitle.trim(),
        slug: editingTitle
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      });
    }
    setIsEditingTitle(false);
  }, [editingTitle, section.title, section.id, onUpdateSection]);

  // Handle click outside and escape key when editing title
  useEffect(() => {
    if (!isEditingTitle) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        // Clicked outside, save if changed
        if (editingTitle.trim() && editingTitle !== section.title) {
          handleTitleSave();
        } else if (!editingTitle.trim()) {
          setEditingTitle(section.title);
          setIsEditingTitle(false);
        } else {
          setIsEditingTitle(false);
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setEditingTitle(section.title);
        setIsEditingTitle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isEditingTitle, editingTitle, section.title, handleTitleSave]);

  // Make section droppable for visual feedback when dragging components
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${section.id}`,
    data: {
      type: "section",
      sectionId: section.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "default",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all ${isDragging ? "opacity-50 ring-2 ring-primary scale-[1.02]" : ""} ${effectiveIsPressed ? "scale-[0.98]" : ""} ${!section.visible ? "opacity-80" : ""}`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-accent hover:text-accent-foreground active:bg-primary active:text-primary-foreground border-0 bg-transparent text-muted-foreground touch-none transition-colors rounded-md"
            aria-label={`Drag handle for section ${section.title}`}
            type="button"
            suppressHydrationWarning
          >
            <GripVertical className="h-5 w-5" />
          </button>
          {isEditingTitle ? (
            <div ref={editContainerRef} className="flex flex-col items-start gap-2 flex-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTitleSave();
                  }
                  // Escape is handled globally now
                }}
                className="text-lg font-semibold h-auto px-3 py-2 bg-background border-2 border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
                placeholder="Enter section title..."
              />
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                Press Enter to save, Escape to cancel or click outside
              </div>
            </div>
          ) : (
            <CardTitle
              className="text-lg cursor-pointer hover:text-primary hover:bg-primary/5 transition-all rounded px-2 py-1 -mx-2 -my-1 group flex items-center gap-2"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit section title"
            >
              {section.title}
              <Edit3 className="h-3 w-3 opacity-40 group-hover:opacity-80 transition-opacity" />
            </CardTitle>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddComponent(section.id)}
            aria-label={`Add component to section ${section.title}`}
          >
            <Plus className="h-4 w-4" />
            Add Component
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(section.id)}
            aria-label={`${section.visible ? "Hide" : "Show"} section ${section.title}`}
          >
            {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(section.id)}
            aria-label={`Delete section ${section.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="text-sm font-medium text-foreground mb-2">Components</h4>
        <div
          ref={setDroppableRef}
          className={`min-h-[50px] rounded-lg transition-all duration-200 ${
            isOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""
          }`}
        >
          {section.visible ? children : <div className="text-sm text-muted-foreground italic">Section hidden</div>}
        </div>
      </CardContent>
    </Card>
  );
}
