"use client";

import { useState, useEffect } from "react";
import { SectionsEditorContent } from "@/components/page/dashboard/sections-editor-content";
import type { User } from "@/types";

interface SectionsEditorPageProps {
  user: User;
  onSaveRef?: (fn: (() => void) | null) => void;
  onPublishRef?: (fn: (() => void) | null) => void;
  onSavingChange?: (saving: boolean) => void;
  onPublishingChange?: (publishing: boolean) => void;
}

export function SectionsEditorPage({
  user,
  currentPath,
  onSaveRef,
  onPublishRef,
  onSavingChange,
  onPublishingChange,
}: SectionsEditorPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Update parent state when our state changes
  const handleSavingChange = (saving: boolean) => {
    setIsSaving(saving);
    onSavingChange?.(saving);
  };

  const handlePublishingChange = (publishing: boolean) => {
    setIsPublishing(publishing);
    onPublishingChange?.(publishing);
  };

  // Set up the save/publish handlers that dispatch events
  const handleSavePortfolio = () => {
    const event = new CustomEvent("saveSections");
    window.dispatchEvent(event);
  };

  const handlePublishPortfolio = () => {
    const event = new CustomEvent("publishSections");
    window.dispatchEvent(event);
  };

  // Provide refs to parent when requested
  useEffect(() => {
    onSaveRef?.(handleSavePortfolio);
    onPublishRef?.(handlePublishPortfolio);
  }, [onSaveRef, onPublishRef]);

  return (
    <div className="p-12">
      <SectionsEditorContent
        user={user}
        onSavingChange={handleSavingChange}
        onPublishingChange={handlePublishingChange}
      />
    </div>
  );
}
