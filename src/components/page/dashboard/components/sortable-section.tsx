"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [editingDescription, setEditingDescription] = useState(section.description);
  const [isPressed, setIsPressed] = useState(false);

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

  // Clear pressed state when dragging starts
  React.useEffect(() => {
    if (isDragging) {
      setIsPressed(false);
    }
  }, [isDragging]);

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

  const handleTitleSave = () => {
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
  };

  const handleDescriptionSave = () => {
    if (editingDescription !== section.description) {
      onUpdateSection(section.id, { description: editingDescription });
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all ${isDragging ? "opacity-50 ring-2 ring-primary scale-[1.02]" : ""} ${isPressed && !isDragging ? "scale-[0.98]" : ""} ${!section.visible ? "opacity-80" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          >
            <GripVertical className="h-5 w-5" />
          </button>
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditingTitle(section.title);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={handleTitleSave}
                className="text-lg font-semibold h-auto p-1 border-none shadow-none focus:ring-0"
              />
            </div>
          ) : (
            <CardTitle
              className="text-lg cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {section.title}
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
            <Plus className="h-4 w-4 mr-2" />
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
        <div className="mb-4">
          <Textarea
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            onBlur={handleDescriptionSave}
            placeholder="Add a description for this section..."
            className="text-sm text-muted-foreground border-none shadow-none focus:ring-0 resize-none min-h-[2rem]"
            rows={1}
          />
        </div>
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
