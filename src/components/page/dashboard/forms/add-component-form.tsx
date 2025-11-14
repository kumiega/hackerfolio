
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Component, ComponentType, ComponentData } from "@/types";
import { validateComponentData } from "@/lib/schemas/component.schemas";
import { TypeSelection } from "./type-selection";
import { TextForm } from "./text-form";
import { CardForm } from "./card-form";
import { PillsForm } from "./pills-form";
import { SocialLinksForm } from "./social-links-form";
import { LinksListForm } from "./links-list-form";
import { ImageForm } from "./image-form";
import { BioForm } from "./bio-form";
import { PersonalInfoForm } from "./personal-info-form";
import { AvatarForm } from "./avatar-form";

interface AddComponentFormProps {
  sectionId: string;
  onSave: (component: Component) => void;
  onCancel: () => void;
}

export function AddComponentForm({ onSave, onCancel }: AddComponentFormProps) {
  const [selectedType, setSelectedType] = useState<ComponentType | "">("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
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
    if (!selectedType) return;

    const validationError = validateComponentData(selectedType, formData as ComponentData);
    if (validationError) {
      setErrors({ general: validationError });
      return;
    }

    const newComponent: Component = {
      id: `component-${Date.now()}`,
      type: selectedType,
      data: formData as ComponentData,
    };
    onSave(newComponent);
  };

  const renderForm = () => {
    if (!selectedType) {
      return <TypeSelection value={selectedType} onChange={setSelectedType} />;
    }

    switch (selectedType) {
      case "text":
        return <TextForm content={formData.content as string} onChange={updateFormData} />;

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
          />
        );

      case "pills":
        return <PillsForm items={formData.items as string[]} onChange={updateFormData} />;

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

      case "links_list":
        return <LinksListForm items={formData.items as { label: string; url: string }[]} onChange={updateFormData} />;

      case "image":
        return <ImageForm url={formData.url as string} alt={formData.alt as string} onChange={updateFormData} />;

      case "bio":
        return (
          <BioForm headline={formData.headline as string} about={formData.about as string} onChange={updateFormData} />
        );

      case "personal_info":
        return <PersonalInfoForm full_name={formData.full_name as string} onChange={updateFormData} />;

      case "avatar":
        return <AvatarForm avatar_url={formData.avatar_url as string} onChange={updateFormData} />;

      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 border-primary border-dashed w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{selectedType ? selectedType.replace("_", " ").toUpperCase() : "NEW COMPONENT"}</Badge>
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Cancel adding component">
          Cancel
        </Button>
      </div>
      {errors.general && <p className="text-sm text-destructive mb-2">{errors.general}</p>}
      <div className="space-y-4 w-full">{renderForm()}</div>
      {selectedType && (
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        </div>
      )}
    </div>
  );
}
