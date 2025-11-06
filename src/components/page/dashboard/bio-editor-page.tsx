"use client";

import { useState, useEffect } from "react";
import { BioEditorContent } from "@/components/page/dashboard/bio-editor-content";
import type { User } from "@/types";

interface BioEditorPageProps {
  user: User;
  onSaveRef?: (fn: (() => void) | null) => void;
  onPublishRef?: (fn: (() => void) | null) => void;
  onSavingChange?: (saving: boolean) => void;
  onPublishingChange?: (publishing: boolean) => void;
}

export function BioEditorPage({
  user,
  onSaveRef,
  onPublishRef,
  onSavingChange,
  onPublishingChange,
}: BioEditorPageProps) {
  const [isSaving, setIsSaving] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isPublishing, setIsPublishing] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

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
    const event = new CustomEvent("saveBio");
    window.dispatchEvent(event);
  };

  const handlePublishPortfolio = () => {
    const event = new CustomEvent("publishBio");
    window.dispatchEvent(event);
  };

  // Provide refs to parent when requested
  useEffect(() => {
    onSaveRef?.(handleSavePortfolio);
    onPublishRef?.(handlePublishPortfolio);
  }, [onSaveRef, onPublishRef]);

  return (
    <BioEditorContent user={user} onSavingChange={handleSavingChange} onPublishingChange={handlePublishingChange} />
  );
}
