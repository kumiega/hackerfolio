"use client";

import { Edit3, Trash2 } from "lucide-react";
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
  onDeleteComponent: (componentId: string) => void;
}

export function BioSection({
  bio,
  editingComponentId,
  onEditComponent,
  onSaveComponent,
  onDeleteComponent,
}: BioSectionProps) {
  if (bio.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Bio Section</CardTitle>
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
                />
              );
            }
            return (
              <div key={component.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <ComponentPreview component={component} />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditComponent(component.id)}
                      aria-label={`Edit ${component.type} component`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteComponent(component.id)}
                      aria-label={`Delete ${component.type} component`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
