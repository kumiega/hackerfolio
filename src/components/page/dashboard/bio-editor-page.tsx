"use client";

import { BioEditorContent } from "@/components/page/dashboard/bio-editor-content";
import type { User } from "@/types";

interface BioEditorPageProps {
  user: User;
}

export function BioEditorPage({ user }: BioEditorPageProps) {
  return <BioEditorContent user={user} />;
}
