"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Component, Section, PortfolioData } from "@/types";
import { mockPortfolioData } from "@/lib/mock-data/portfolio.mock";
import { BioSection } from "./components/bio-section";
import { EmptySections } from "./components/empty-sections";
import { DragOverlayContent } from "./components/drag-overlay-content";
import { SectionContent } from "./components/section-content";
import { EditorHeader } from "./components/editor-header";
import { validateComponentData } from "@/lib/schemas/component.schemas";

export function EditorContent() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(mockPortfolioData);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [addingComponentSectionId, setAddingComponentSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8 to 3 for easier dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Helper to find which section contains a component
    const findComponentSection = (componentId: string) => {
      return portfolioData.sections.find((section) => section.components.some((comp) => comp.id === componentId));
    };

    if (activeType === "section" && overType === "section") {
      // Reordering sections
      setPortfolioData((prev) => {
        const oldIndex = prev.sections.findIndex((section) => section.id === active.id);
        const newIndex = prev.sections.findIndex((section) => section.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }

        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
    } else if (activeType === "component" && overType === "component") {
      // Reordering or moving components
      const activeSection = findComponentSection(active.id as string);
      const overSection = findComponentSection(over.id as string);

      if (!activeSection || !overSection) {
        setActiveId(null);
        return;
      }

      if (activeSection.id === overSection.id) {
        // Same section - reorder
        setPortfolioData((prev) => ({
          ...prev,
          sections: prev.sections.map((section) => {
            if (section.id === activeSection.id) {
              const oldIndex = section.components.findIndex((comp) => comp.id === active.id);
              const newIndex = section.components.findIndex((comp) => comp.id === over.id);
              return {
                ...section,
                components: arrayMove(section.components, oldIndex, newIndex),
              };
            }
            return section;
          }),
        }));
      } else {
        // Different sections - move component
        setPortfolioData((prev) => {
          const componentToMove = activeSection.components.find((comp) => comp.id === active.id);
          if (!componentToMove) return prev;

          const overComponentIndex = overSection.components.findIndex((comp) => comp.id === over.id);

          return {
            ...prev,
            sections: prev.sections.map((section) => {
              if (section.id === activeSection.id) {
                // Remove from source
                return {
                  ...section,
                  components: section.components.filter((comp) => comp.id !== active.id),
                };
              }
              if (section.id === overSection.id) {
                // Add to target at the position of the over component
                const newComponents = [...section.components];
                newComponents.splice(overComponentIndex, 0, componentToMove);
                return {
                  ...section,
                  components: newComponents,
                };
              }
              return section;
            }),
          };
        });
      }
    } else if (activeType === "component" && overType === "section") {
      // Dropping component directly onto a section (likely empty section)
      const activeSection = findComponentSection(active.id as string);

      // Handle both regular section IDs and droppable-{sectionId} format
      const targetSectionId =
        over.data.current?.sectionId ||
        (typeof over.id === "string" && over.id.startsWith("droppable-") ? over.id.replace("droppable-", "") : over.id);

      const targetSection = portfolioData.sections.find((s) => s.id === targetSectionId);

      if (!activeSection || !targetSection) {
        setActiveId(null);
        return;
      }

      // Don't move if dropping on the same section
      if (activeSection.id === targetSection.id) {
        setActiveId(null);
        return;
      }

      // Move component to end of target section
      setPortfolioData((prev) => {
        const componentToMove = activeSection.components.find((comp) => comp.id === active.id);
        if (!componentToMove) return prev;

        return {
          ...prev,
          sections: prev.sections.map((section) => {
            if (section.id === activeSection.id) {
              // Remove from source
              return {
                ...section,
                components: section.components.filter((comp) => comp.id !== active.id),
              };
            }
            if (section.id === targetSection.id) {
              // Add to target at the end
              return {
                ...section,
                components: [...section.components, componentToMove],
              };
            }
            return section;
          }),
        };
      });
    }

    setActiveId(null);
  };

  const handleAddSection = useCallback(() => {
    if (portfolioData.sections.length >= 10) {
      alert("Maximum 10 sections allowed");
      return;
    }

    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: "New Section",
      slug: "new-section",
      description: "",
      visible: true,
      components: [],
    };

    setPortfolioData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  }, [portfolioData.sections.length]);

  const handleDeleteSection = (sectionId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    if (updates.title && updates.title.length > 150) {
      alert("Section title must be 150 characters or less");
      return;
    }

    if (updates.description !== undefined && updates.description.length > 500) {
      alert("Section description must be 500 characters or less");
      return;
    }

    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
    }));
  };

  const handleAddComponent = (sectionId: string) => {
    setAddingComponentSectionId(sectionId);
    setEditingComponentId(null);
  };

  const handleSaveNewComponent = (component: Component) => {
    if (!addingComponentSectionId) return;

    // Enforce: Bio can only exist in fixed Bio section, not within sections
    if (component.type === "bio") {
      alert("Bio can only be added in the fixed Bio section at the top.");
      return;
    }

    const totalComponents = portfolioData.sections.reduce((acc, section) => acc + section.components.length, 0);
    if (totalComponents >= 15) {
      alert("Maximum 15 components allowed across all sections");
      return;
    }

    const validationError = validateComponentData(component.type, component.data);
    if (validationError) {
      alert(validationError);
      return;
    }

    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === addingComponentSectionId) {
          return {
            ...section,
            components: [...section.components, component],
          };
        }
        return section;
      }),
    }));

    setAddingComponentSectionId(null);
  };

  const handleEditComponent = (componentId: string) => {
    setEditingComponentId(componentId);
    setAddingComponentSectionId(null);
  };

  const handleSaveComponent = (component: Component) => {
    const validationError = validateComponentData(component.type, component.data);
    if (validationError) {
      alert(validationError);
      return;
    }

    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        components: section.components.map((comp) => (comp.id === component.id ? component : comp)),
      })),
    }));

    setEditingComponentId(null);
  };

  const handleDeleteComponent = (componentId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        components: section.components.filter((component) => component.id !== componentId),
      })),
    }));
  };

  const handleSaveBioComponent = (component: Component) => {
    const validationError = validateComponentData(component.type, component.data);
    if (validationError) {
      alert(validationError);
      return;
    }

    setPortfolioData((prev) => ({
      ...prev,
      bio: prev.bio.map((comp) => (comp.id === component.id ? component : comp)),
    }));

    setEditingComponentId(null);
  };

  const handleDeleteBioComponent = (componentId: string) => {
    if (confirm("Are you sure you want to delete this bio component?")) {
      setPortfolioData((prev) => ({
        ...prev,
        bio: prev.bio.filter((component) => component.id !== componentId),
      }));
    }
  };

  const handleSavePortfolio = useCallback(() => {
    // TODO: Implement API call to save portfolio
    // eslint-disable-next-line no-console
    console.log("Saving portfolio:", portfolioData);
  }, [portfolioData]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSavePortfolio();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault();
        handleAddSection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSavePortfolio, handleAddSection]);

  // Custom collision detection that handles nested contexts better
  const collisionDetection: CollisionDetection = (args) => {
    const activeType = args.active?.data?.current?.type as string | undefined;

    // For sections, use closestCenter
    if (activeType === "section") {
      return closestCenter(args);
    }

    // For components, use pointerWithin first for better precision during drag
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // Fallback to closestCenter for components
    return closestCenter(args);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 flex-col p-12">
        <EditorHeader onAddSection={handleAddSection} onSavePortfolio={handleSavePortfolio} />

        <div className="space-y-3">
          <BioSection
            bio={portfolioData.bio}
            editingComponentId={editingComponentId}
            onEditComponent={handleEditComponent}
            onSaveComponent={handleSaveBioComponent}
            onDeleteComponent={handleDeleteBioComponent}
          />

          <SectionContent
            sections={portfolioData.sections}
            editingComponentId={editingComponentId}
            addingComponentSectionId={addingComponentSectionId}
            onToggleSectionVisibility={handleToggleSectionVisibility}
            onDeleteSection={handleDeleteSection}
            onAddComponent={handleAddComponent}
            onUpdateSection={handleUpdateSection}
            onEditComponent={handleEditComponent}
            onSaveComponent={handleSaveComponent}
            onDeleteComponent={handleDeleteComponent}
            onSaveNewComponent={handleSaveNewComponent}
            onCancelAddComponent={() => setAddingComponentSectionId(null)}
          />

          {portfolioData.sections.length === 0 && <EmptySections onAddSection={handleAddSection} />}
        </div>
      </div>

      <DragOverlay>
        <DragOverlayContent activeId={activeId} sections={portfolioData.sections} />
      </DragOverlay>
    </DndContext>
  );
}
