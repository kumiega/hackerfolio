"use client";

import { SectionsEditorContent } from "@/components/page/dashboard/sections-editor-content";
import type { User } from "@/types";

interface SectionsEditorPageProps {
  user: User;
}

export function SectionsEditorPage({ user }: SectionsEditorPageProps) {
  return <SectionsEditorContent user={user} />;
}
