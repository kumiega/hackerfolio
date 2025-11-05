"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Component, ComponentData } from "@/types";
import { validateComponentData } from "@/lib/schemas/component.schemas";
import { TextForm } from "./forms/text-form";
import { CardForm } from "./forms/card-form";
import { PillsForm } from "./forms/pills-form";
import { SocialLinksForm } from "./forms/social-links-form";
import { BioForm } from "./forms/bio-form";
import { FullNameForm } from "./forms/full-name-form";
import { AvatarForm } from "./forms/avatar-form";
import { ListForm } from "./forms/list-form";

interface ComponentEditorProps {
  component: Component;
  onSave: (component: Component) => void;
  onCancel: () => void;
  githubAvatarUrl?: string;
}

export function ComponentEditor({ component, onSave, onCancel, githubAvatarUrl }: ComponentEditorProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const data = component.data as Record<string, unknown>;
    // Initialize cards component with empty array if not present
    if (component.type === "cards" && !data.cards) {
      return { cards: [] };
    }
    return data;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors: Record<string, string> = {};
        for (const key in prev) {
          if (key !== field) {
            newErrors[key] = prev[key];
          }
        }
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    const validationError = validateComponentData(component.type, formData as ComponentData);
    if (validationError) {
      setErrors({ general: validationError });
      return;
    }

    const updatedComponent: Component = {
      ...component,
      data: formData as ComponentData,
    };
    onSave(updatedComponent);
  };

  const renderForm = () => {
    switch (component.type) {
      case "text":
        return <TextForm content={formData.content as string} onChange={updateFormData} error={errors.content} />;

      case "cards":
        return (
          <CardForm
            cards={
              formData.cards as {
                repo_url: string;
                title: string;
                summary: string;
                tech: string[];
              }[]
            }
            onChange={updateFormData}
            errors={errors}
          />
        );

      case "pills":
        return <PillsForm items={formData.items as string[]} onChange={updateFormData} error={errors.items} />;

      case "social_links":
        return (
          <SocialLinksForm
            github={formData.github as string}
            linkedin={formData.linkedin as string}
            x={formData.x as string}
            website={formData.website as { name: string; url: string }[]}
            onChange={updateFormData}
          />
        );

      case "bio":
        return (
          <BioForm
            headline={formData.headline as string}
            about={formData.about as string}
            onChange={updateFormData}
            headlineError={errors.headline}
          />
        );

      case "full_name":
        return (
          <FullNameForm full_name={formData.full_name as string} onChange={updateFormData} error={errors.full_name} />
        );

      case "avatar":
        return (
          <AvatarForm
            avatar_url={formData.avatar_url as string}
            onChange={updateFormData}
            githubAvatarUrl={githubAvatarUrl}
          />
        );

      case "list":
        return <ListForm items={formData.items as { label: string; url: string }[]} onChange={updateFormData} />;

      default:
        return <div className="text-center py-4 text-muted-foreground">Unknown component type</div>;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-neutral-50">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{component.type.replace("_", " ").toUpperCase()}</Badge>
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Cancel editing">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {errors.general && <p className="text-sm text-destructive mb-2">{errors.general}</p>}
      <div className="space-y-4">{renderForm()}</div>
      <div className="flex justify-end gap-2 mt-4 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
