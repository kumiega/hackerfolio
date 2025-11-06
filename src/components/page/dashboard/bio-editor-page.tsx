"use client";

import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/page/dashboard/layout";
import { BioEditorContent } from "@/components/page/dashboard/bio-editor-content";
import type { User } from "@/types";

interface BioEditorPageProps {
  user: User;
  currentPath: string;
}

export function BioEditorPage({ user, currentPath }: BioEditorPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const saveRef = useRef<(() => void) | null>(null);
  const publishRef = useRef<(() => void) | null>(null);

  const handleSavePortfolio = () => {
    saveRef.current?.();
  };

  const handlePublishPortfolio = () => {
    publishRef.current?.();
  };

  return (
    <DashboardLayout
      currentPath={currentPath}
      user={user}
      onSavePortfolio={handleSavePortfolio}
      onPublishPortfolio={handlePublishPortfolio}
      isSaving={isSaving}
      isPublishing={isPublishing}
    >
      <BioEditorContent
        user={user}
        onSavingChange={setIsSaving}
        onPublishingChange={setIsPublishing}
        onSaveRef={(fn) => (saveRef.current = fn)}
        onPublishRef={(fn) => (publishRef.current = fn)}
      />
    </DashboardLayout>
  );
}
