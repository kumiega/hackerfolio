"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/page/dashboard/layout";
import { SectionsEditorContent } from "@/components/page/dashboard/sections-editor-content";
import type { User } from "@/types";

interface SectionsEditorPageProps {
  user: User;
  currentPath: string;
}

export function SectionsEditorPage({ user, currentPath }: SectionsEditorPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  return (
    <DashboardLayout
      currentPath={currentPath}
      user={user}
      onSavePortfolio={() => {
        // This will be set by the content component
        const event = new CustomEvent("saveSections");
        window.dispatchEvent(event);
      }}
      onPublishPortfolio={() => {
        const event = new CustomEvent("publishSections");
        window.dispatchEvent(event);
      }}
      isSaving={isSaving}
      isPublishing={isPublishing}
    >
      <SectionsEditorContent user={user} onSavingChange={setIsSaving} onPublishingChange={setIsPublishing} />
    </DashboardLayout>
  );
}
