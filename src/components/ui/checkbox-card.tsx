"use client";

import * as React from "react";
import { StarIcon, ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { GitHubRepoDto } from "@/types";

interface CheckboxCardProps {
  repo: GitHubRepoDto;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

function CheckboxCard({ repo, checked, onCheckedChange, className }: CheckboxCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on the checkbox itself (let the checkbox handle it)
    if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
      return;
    }
    onCheckedChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Trigger on Enter or Space
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  };

  return (
    <div
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 border py-4 px-6 cursor-pointer transition-all hover:shadow-md",
        checked && "ring ring-primary border-primary",
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={checked}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{repo.name}</h3>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{repo.full_name}</p>
          <div className="flex items-center gap-1 mt-2">
            <StarIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{repo.stargazers_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CheckboxCard };
