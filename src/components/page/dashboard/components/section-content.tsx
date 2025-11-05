"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Section, Component } from "@/types";
import { SortableSection } from "./sortable-section";
import { ComponentEditor } from "./component-editor";
import { SortableComponent } from "./sortable-component";
import { ComponentPreview } from "./component-preview";
import { AddComponentForm } from "./add-component-form";

interface SectionContentProps {
  sections: Section[];
  editingComponentId: string | null;
  addingComponentSectionId: string | null;
  onToggleSectionVisibility: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddComponent: (sectionId: string) => void;
  onUpdateSection: (sectionId: string, updates: Partial<Section>) => void;
  onEditComponent: (componentId: string) => void;
  onSaveComponent: (component: Component) => void;
  onDeleteComponent: (componentId: string) => void;
  onSaveNewComponent: (component: Component) => void;
  onCancelAddComponent: () => void;
  githubAvatarUrl?: string;
}

export function SectionContent({
  sections,
  editingComponentId,
  addingComponentSectionId,
  onToggleSectionVisibility,
  onDeleteSection,
  onAddComponent,
  onUpdateSection,
  onEditComponent,
  onSaveComponent,
  onDeleteComponent,
  onSaveNewComponent,
  onCancelAddComponent,
  githubAvatarUrl,
}: SectionContentProps) {
  return (
    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
      {sections.map((section) => (
        <SortableSection
          key={section.id}
          section={section}
          onToggleVisibility={onToggleSectionVisibility}
          onDelete={onDeleteSection}
          onAddComponent={onAddComponent}
          onUpdateSection={onUpdateSection}
        >
          <SortableContext items={section.components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {section.components.map((component) => {
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
                  <SortableComponent
                    key={component.id}
                    component={component}
                    onEdit={onEditComponent}
                    onDelete={onDeleteComponent}
                  >
                    <ComponentPreview component={component} />
                  </SortableComponent>
                );
              })}

              {addingComponentSectionId === section.id && (
                <AddComponentForm sectionId={section.id} onSave={onSaveNewComponent} onCancel={onCancelAddComponent} />
              )}

              {section.components.length === 0 && !addingComponentSectionId && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No components in this section yet.</p>
                  <p className="text-xs mt-1">Add components to get started</p>
                </div>
              )}
            </div>
          </SortableContext>
        </SortableSection>
      ))}
    </SortableContext>
  );
}
