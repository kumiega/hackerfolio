"use client";

import type { User } from "@/types";

interface ThemePageProps {
  user: User;
  currentPath: string;
}

export function ThemePage({ user, currentPath }: ThemePageProps) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Themes</h1>
            <p className="text-muted-foreground">Select your preferred theme for your portfolio.</p>
          </div>
        </div>
      </div>
      <div className="bg-muted/20 aspect-video animate-pulse max-h-[40vh] grid place-items-center">Coming soon...</div>
    </div>
  );
}
