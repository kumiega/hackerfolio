"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Component, ComponentData } from "@/types";
import { validateComponentData } from "@/lib/schemas/component.schemas";

interface ComponentEditorProps {
  component: Component;
  onSave: (component: Component) => void;
  onCancel: () => void;
}

export function ComponentEditor({ component, onSave, onCancel }: ComponentEditorProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(component.data as Record<string, unknown>);
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
        return (
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={(formData.content as string) || ""}
              onChange={(e) => updateFormData("content", e.target.value)}
              placeholder="Enter your text content..."
              rows={4}
              className={errors.content ? "border-destructive" : ""}
            />
            <p className="text-sm text-muted-foreground">
              {((formData.content as string) || "").length}/2000 characters
            </p>
            {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
          </div>
        );

      case "card":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo_url">Repository URL</Label>
              <Input
                id="repo_url"
                value={(formData.repo_url as string) || ""}
                onChange={(e) => updateFormData("repo_url", e.target.value)}
                placeholder="https://github.com/user/repo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={(formData.title as string) || ""}
                onChange={(e) => updateFormData("title", e.target.value)}
                placeholder="Project title"
                className={errors.title ? "border-destructive" : ""}
              />
              <p className="text-sm text-muted-foreground">
                {((formData.title as string) || "").length}/100 characters
              </p>
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={(formData.summary as string) || ""}
                onChange={(e) => updateFormData("summary", e.target.value)}
                placeholder="Brief project description..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                {((formData.summary as string) || "").length}/500 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label>Technologies</Label>
              <Textarea
                value={(formData.tech as string[])?.join(", ") || ""}
                onChange={(e) => {
                  const tech = e.target.value
                    .split(",")
                    .map((t: string) => t.trim())
                    .filter(Boolean);
                  updateFormData("tech", tech);
                }}
                placeholder="React, TypeScript, Node.js"
                rows={2}
              />
            </div>
          </div>
        );

      case "pills":
        return (
          <div className="space-y-2">
            <Label>Skills/Technologies</Label>
            <Textarea
              value={(formData.items as string[])?.join(", ") || ""}
              onChange={(e) => {
                const items = e.target.value
                  .split(",")
                  .map((item: string) => item.trim())
                  .filter(Boolean);
                updateFormData("items", items);
              }}
              placeholder="React, TypeScript, Node.js, Python"
              rows={3}
              className={errors.items ? "border-destructive" : ""}
            />
            <p className="text-sm text-muted-foreground">{(formData.items as string[])?.length || 0} items (max 30)</p>
            {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
          </div>
        );

      case "social_links":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={(formData.github as string) || ""}
                onChange={(e) => updateFormData("github", e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={(formData.linkedin as string) || ""}
                onChange={(e) => updateFormData("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="x">X (Twitter)</Label>
              <Input
                id="x"
                value={(formData.x as string) || ""}
                onChange={(e) => updateFormData("x", e.target.value)}
                placeholder="https://twitter.com/username"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <div className="space-y-2">
                {Array.isArray(formData.website) &&
                  (formData.website as { name: string; url: string }[]).map((site, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={site.name || ""}
                        onChange={(e) => {
                          const currentWebsites = Array.isArray(formData.website)
                            ? (formData.website as { name: string; url: string }[])
                            : [];
                          const newWebsites = [...currentWebsites];
                          newWebsites[index] = { ...newWebsites[index], name: e.target.value };
                          updateFormData("website", newWebsites);
                        }}
                        placeholder="Site name"
                      />
                      <Input
                        value={site.url || ""}
                        onChange={(e) => {
                          const currentWebsites = Array.isArray(formData.website)
                            ? (formData.website as { name: string; url: string }[])
                            : [];
                          const newWebsites = [...currentWebsites];
                          newWebsites[index] = { ...newWebsites[index], url: e.target.value };
                          updateFormData("website", newWebsites);
                        }}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentWebsites = Array.isArray(formData.website)
                            ? (formData.website as { name: string; url: string }[])
                            : [];
                          const newWebsites = currentWebsites.filter((_, i: number) => i !== index);
                          updateFormData("website", newWebsites);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentWebsites = Array.isArray(formData.website)
                      ? (formData.website as { name: string; url: string }[])
                      : [];
                    const newWebsites = [...currentWebsites, { name: "", url: "" }];
                    updateFormData("website", newWebsites);
                  }}
                >
                  Add Website
                </Button>
              </div>
            </div>
          </div>
        );

      case "bio":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={(formData.headline as string) || ""}
                onChange={(e) => updateFormData("headline", e.target.value)}
                placeholder="Software Engineer & Full Stack Developer"
                className={errors.headline ? "border-destructive" : ""}
              />
              <p className="text-sm text-muted-foreground">
                {((formData.headline as string) || "").length}/120 characters
              </p>
              {errors.headline && <p className="text-sm text-destructive">{errors.headline}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={(formData.about as string) || ""}
                onChange={(e) => updateFormData("about", e.target.value)}
                placeholder="Tell visitors about yourself..."
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                {((formData.about as string) || "").length}/2000 characters
              </p>
            </div>
          </div>
        );

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
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
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
