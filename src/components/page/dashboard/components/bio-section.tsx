"use client";

import { Edit3, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Component } from "@/types";
import { ComponentPreview } from "./component-preview";
import { ComponentEditor } from "./component-editor";

interface BioSectionProps {
  bio: Component[];
  editingComponentId: string | null;
  onEditComponent: (componentId: string) => void;
  onSaveComponent: (component: Component) => void;
  onToggleComponentVisibility: (componentId: string) => void;
  onDeleteComponent?: (componentId: string) => void;
  githubAvatarUrl?: string;
}

export function BioSection({
  bio,
  editingComponentId,
  onEditComponent,
  onSaveComponent,
  onToggleComponentVisibility,
  onDeleteComponent,
  githubAvatarUrl,
}: BioSectionProps) {
  // Filter to show only visible components, but allow editing of hidden ones
  const visibleBio = bio.filter((component) => component.visible !== false);
  if (visibleBio.length === 0 && bio.length === 0) return null;

  // Default bio components that cannot be removed or have limited actions
  const isDefaultBioComponent = (component: Component) => {
    return ["personal_info", "avatar", "social_links", "text"].includes(component.type);
  };

  return (
    <Card className="border bg-background">
      <CardHeader>
        <CardTitle className="text-lg">Your Bio</CardTitle>
        <CardDescription>This section appears at the top of your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {bio.map((component) => {
            if (editingComponentId === component.id) {
              return (
                <ComponentEditor
                  key={component.id}
                  component={component}
                  onSave={onSaveComponent}
                  onCancel={() => onEditComponent("")}
                  githubAvatarUrl={githubAvatarUrl}
                />
              );
            }
            return (
              <div
                key={component.id}
                className={`border rounded-lg p-3 ${component.visible === false ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <ComponentPreview component={component} />
                    {component.visible === false && (
                      <p className="text-xs text-muted-foreground mt-1">Hidden from portfolio</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditComponent(component.id)}
                      aria-label={`Edit ${component.type === "personal_info" ? "Personal Info" : component.type} component`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {!isDefaultBioComponent(component) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleComponentVisibility(component.id)}
                          aria-label={`${component.visible === false ? "Show" : "Hide"} ${component.type === "personal_info" ? "Personal Info" : component.type} component`}
                        >
                          {component.visible === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        {onDeleteComponent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteComponent(component.id)}
                            aria-label={`Delete ${component.type} component`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
