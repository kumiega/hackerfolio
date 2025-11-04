"use client";

import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorHeaderProps {
  onAddSection: () => void;
  onSavePortfolio: () => void;
}

export function EditorHeader({ onAddSection, onSavePortfolio }: EditorHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Portfolio Editor</h1>
        <p className="text-muted-foreground">Drag and drop to organize your portfolio sections and components</p>
        <p className="text-xs text-muted-foreground mt-1">Keyboard shortcuts: Ctrl+S to save, Ctrl+N to add section</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onAddSection} variant="outline" className="gap-2" aria-label="Add new section">
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
        <Button onClick={onSavePortfolio} className="gap-2" aria-label="Save portfolio changes">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
