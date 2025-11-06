"use client";

import { Plus, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface EditorHeaderProps {
  onAddSection: () => void;
  onSavePortfolio: () => void;
  onPublishPortfolio: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
}

export function EditorHeader({
  onAddSection,
  onSavePortfolio,
  onPublishPortfolio,
  isSaving = false,
  isPublishing = false,
}: EditorHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Portfolio Editor</h1>
        <p className="text-muted-foreground">Edit and customize your portfolio sections and components</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onAddSection} variant="outline" className="gap-2" aria-label="Add new section">
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
        <Button
          variant="muted"
          onClick={onSavePortfolio}
          disabled={isSaving}
          className="gap-2 min-w-36 transition-all duration-200"
          aria-label={isSaving ? "Saving portfolio changes" : "Save portfolio changes"}
        >
          {isSaving ? (
            <>
              <Spinner className="h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save draft
            </>
          )}
        </Button>
        <Button
          onClick={onPublishPortfolio}
          disabled={isPublishing || isSaving}
          className="gap-2 min-w-36 transition-all duration-200"
          variant="default"
          aria-label={isPublishing ? "Publishing portfolio" : "Publish portfolio"}
        >
          {isPublishing ? (
            <>
              <Spinner className="h-4 w-4" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
