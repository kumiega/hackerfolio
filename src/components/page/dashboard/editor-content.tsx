"use client";

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

import type { Component, Section, PortfolioData, User } from "@/types";

import { BioSection } from "./components/bio-section";
import { EmptySections } from "./components/empty-sections";
import { DragOverlayContent } from "./components/drag-overlay-content";
import { SectionContent } from "./components/section-content";
import { EditorHeader } from "./components/editor-header";
import { Spinner } from "@/components/ui/spinner";

import { validateComponentData } from "@/lib/schemas/component.schemas";


import { toast } from "sonner";

// Default empty portfolio structure
const defaultPortfolioData: PortfolioData = {
  full_name: "",
  position: "",
  bio: [],
  avatar_url: null,
  sections: [],
};

// Portfolio API client for client-side use
const PortfolioApiClient = {
  async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      if (response.status === 403) {
        throw new Error("Access denied");
      }
      if (response.status === 404) {
        throw new Error("Portfolio not found");
      }

      let errorMessage = "API request failed";
      let errorCode = "";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        errorCode = errorData.error?.code || "";
      } catch {
        // Ignore JSON parsing errors
      }

      // Handle specific error codes
      if (errorCode === "DATABASE_ERROR") {
        throw new Error("Database error occurred");
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  async getUserPortfolio(): Promise<{ id: string; draft_data: PortfolioData } | null> {
    const response = await fetch("/api/v1/portfolios/me");
    if (response.status === 404) return null;
    return this.handleResponse(response);
  },

  async updatePortfolio(
    portfolioId: string,
    draftData: PortfolioData
  ): Promise<{ id: string; draft_data: PortfolioData }> {
    const response = await fetch(`/api/v1/portfolios/${portfolioId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft_data: draftData,
      }),
    });
    return this.handleResponse(response);
  },

  async createPortfolio(draftData: PortfolioData): Promise<{ id: string; draft_data: PortfolioData }> {
    const response = await fetch("/api/v1/portfolios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft_data: draftData,
      }),
    });
    return this.handleResponse(response);
  },

  async publishPortfolio(portfolioId: string): Promise<{ published_at: string }> {
    const response = await fetch(`/api/v1/portfolios/${portfolioId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return this.handleResponse(response);
  },
};

interface EditorContentProps {
  user?: User;
}

export function EditorContent({ user }: EditorContentProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(defaultPortfolioData);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [addingComponentSectionId, setAddingComponentSectionId] = useState<string | null>(null);

  // Load portfolio data on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      if (!user?.user_id) {
        // No user, keep default empty portfolio
        setIsLoading(false);
        setIsDataLoaded(true);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Loading portfolio for user:", user.user_id);
        const portfolio = await PortfolioApiClient.getUserPortfolio();
        console.log("Portfolio response:", portfolio);

        if (portfolio) {
          setPortfolioData(portfolio.draft_data);
          setPortfolioId(portfolio.id);
          setIsDataLoaded(true);
        } else {
          // No portfolio exists yet, keep default empty portfolio
          console.log("No portfolio found for user, using default empty portfolio");
          setPortfolioData(defaultPortfolioData);
          setIsDataLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : "Unknown error",
          name: err instanceof Error ? err.name : "Unknown",
          stack: err instanceof Error ? err.stack : "No stack",
        });

        // Check if this is a database setup issue
        if (
          err instanceof Error &&
          (err.message.includes("Database error") ||
            err.message.includes("DATABASE_ERROR") ||
            err.message.includes("relation") ||
            err.message.includes("does not exist"))
        ) {
          setError("Database not set up yet. Please run migrations and try again.");
        } else {
          setError("Failed to load portfolio data");
        }

        // Keep default empty portfolio as fallback
        setPortfolioData(defaultPortfolioData);
        setIsDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [user?.user_id]);
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
      toast.error("Maximum 10 sections allowed");
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
      toast.error("Section title must be 150 characters or less");
      return;
    }

    if (updates.description !== undefined && updates.description.length > 500) {
      toast.error("Section description must be 500 characters or less");
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
      toast.error("Bio can only be added in the fixed Bio section at the top.");
      return;
    }

    const totalComponents = portfolioData.sections.reduce((acc, section) => acc + section.components.length, 0);
    if (totalComponents >= 15) {
      toast.error("Maximum 15 components allowed across all sections");
      return;
    }

    const validationError = validateComponentData(component.type, component.data);
    if (validationError) {
      toast.error(validationError);
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
      toast.error(validationError);
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
      toast.error(validationError);
      return;
    }

    setPortfolioData((prev) => ({
      ...prev,
      bio: prev.bio.map((comp) => (comp.id === component.id ? component : comp)),
    }));

    setEditingComponentId(null);
  };

  const handleToggleBioComponentVisibility = (componentId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      bio: prev.bio.map((component) =>
        component.id === componentId ? { ...component, visible: component.visible !== false ? false : true } : component
      ),
    }));
  };

  const handleSavePortfolio = useCallback(async () => {
    if (!portfolioData || !user?.user_id) {
      console.warn("No portfolio data or user available");
      return;
    }

    if (isSaving) {
      return; // Prevent multiple save operations
    }

    const toastId = toast.loading("Saving portfolio...");

    try {
      setIsSaving(true);
      setError(null);

      if (portfolioId) {
        // Update existing portfolio
        await PortfolioApiClient.updatePortfolio(portfolioId, portfolioData);
      } else {
        // Create new portfolio
        const newPortfolio = await PortfolioApiClient.createPortfolio(portfolioData);
        setPortfolioId(newPortfolio.id);
      }

      toast.success("Draft saved successfully!", { id: toastId });
      console.log("Portfolio saved successfully");
    } catch (err) {
      console.error("Failed to save portfolio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save portfolio";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [portfolioData, portfolioId, user?.user_id, isSaving]);

  const handlePublishPortfolio = useCallback(async () => {
    if (!portfolioId || !user?.user_id) {
      toast.error("No portfolio available to publish");
      return;
    }

    if (isPublishing || isSaving) {
      return; // Prevent multiple operations
    }

    // Validate draft data before publishing
    const sectionCount = portfolioData.sections?.length || 0;
    const bioCount = portfolioData.bio?.length || 0;
    const componentCount =
      portfolioData.sections?.reduce((sum, section) => sum + (section.components?.length || 0), 0) || 0;

    if (sectionCount < 1) {
      toast.error("Portfolio must have at least 1 section to publish");
      return;
    }

    if (componentCount < 1 && bioCount < 1) {
      toast.error("Portfolio must have at least 1 component (in sections or bio) to publish");
      return;
    }

    const toastId = toast.loading("Publishing portfolio...");

    try {
      setIsPublishing(true);

      await PortfolioApiClient.publishPortfolio(portfolioId);

      toast.success("Portfolio published successfully!", { id: toastId });
      console.log("Portfolio published successfully");
    } catch (err) {
      console.error("Failed to publish portfolio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to publish portfolio";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  }, [portfolioId, user?.user_id, isPublishing, isSaving, portfolioData]);

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p className="text-muted-foreground">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Don't render until portfolio data is loaded
  if (!isDataLoaded) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 flex-col p-12">
        <EditorHeader
          onAddSection={handleAddSection}
          onSavePortfolio={handleSavePortfolio}
          onPublishPortfolio={handlePublishPortfolio}
          isSaving={isSaving}
          isPublishing={isPublishing}
        />

        <div className="space-y-3">
          <BioSection
            bio={portfolioData.bio}
            editingComponentId={editingComponentId}
            onEditComponent={handleEditComponent}
            onSaveComponent={handleSaveBioComponent}
            onToggleComponentVisibility={handleToggleBioComponentVisibility}
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
