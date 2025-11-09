"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
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

import type { Component, Section, PortfolioData, PortfolioDto, User } from "@/types";
import { usePortfolioChangeTracker } from "@/lib/portfolio-change-tracker";

import { EmptySections } from "./components/empty-sections";
import { DragOverlayContent } from "./components/drag-overlay-content";
import { SectionContent } from "./components/section-content";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.error?.message || error.message || "Request failed");
    }
    const data = await response.json();
    return data.data;
  },

  async getPortfolio(userId: string): Promise<PortfolioDto> {
    const response = await fetch(`/api/v1/portfolios/me`, {
      method: "GET",
    });
    return this.handleResponse<PortfolioDto>(response);
  },

  async updatePortfolio(id: string, data: Partial<PortfolioData>): Promise<PortfolioData> {
    const response = await fetch(`/api/v1/portfolios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<PortfolioData>(response);
  },

  async createPortfolio(data: PortfolioData): Promise<{ id: string }> {
    const response = await fetch("/api/v1/portfolios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ id: string }>(response);
  },
};

interface SectionsEditorContentProps {
  user: User;
}

export function SectionsEditorContent({ user }: SectionsEditorContentProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(defaultPortfolioData);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [addingComponentSectionId, setAddingComponentSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"section" | "component" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the global change tracker
  const {
    markAsChanged,
    markAsSaved,
    markAsPublished,
    setInitialState,
    saveSectionsRef,
    publishRef,
    setSaving,
    setPublishing,
    portfolioState,
  } = usePortfolioChangeTracker();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load portfolio data on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const portfolio = await PortfolioApiClient.getPortfolio(user.user_id);
        setPortfolioData(portfolio.draft_data);
        setPortfolioId(portfolio.id);

        // Set initial state in change tracker
        setInitialState(
          portfolio.draft_data,
          portfolio.updated_at || undefined,
          portfolio.last_published_at || undefined
        );
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load portfolio";

        // If portfolio doesn't exist, use default empty structure
        if (errorMessage.includes("not found")) {
          setPortfolioData(defaultPortfolioData);
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [user.user_id]);

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
    }));
    markAsChanged();
  };

  const handleDeleteSection = (sectionId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
    markAsChanged();
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ),
    }));
    markAsChanged();
  };

  const handleEditComponent = useCallback((componentId: string) => {
    setEditingComponentId(componentId);
  }, []);

  const handleSaveComponent = useCallback(
    (component: Component) => {
      setPortfolioData((prev) => {
        const updatedSections = prev.sections.map((section) => ({
          ...section,
          components: section.components.map((c) => (c.id === component.id ? component : c)),
        }));
        return {
          ...prev,
          sections: updatedSections,
        };
      });
      setEditingComponentId(null);
      markAsChanged();
    },
    [markAsChanged]
  );

  const handleSaveNewComponent = useCallback(
    (component: Component) => {
      if (!addingComponentSectionId) return;

      setPortfolioData((prev) => {
        const updatedSections = prev.sections.map((section) => {
          if (section.id === addingComponentSectionId) {
            return {
              ...section,
              components: [...section.components, component],
            };
          }
          return section;
        });
        return {
          ...prev,
          sections: updatedSections,
        };
      });
      setAddingComponentSectionId(null);
      markAsChanged();
    },
    [addingComponentSectionId, markAsChanged]
  );

  const handleDeleteComponent = (componentId: string) => {
    setPortfolioData((prev) => {
      const updatedSections = prev.sections.map((section) => ({
        ...section,
        components: section.components.filter((component) => component.id !== componentId),
      }));
      return {
        ...prev,
        sections: updatedSections,
      };
    });
    markAsChanged();
  };

  const handleToggleComponentVisibility = (componentId: string) => {
    setPortfolioData((prev) => {
      const updatedSections = prev.sections.map((section) => ({
        ...section,
        components: section.components.map((component) =>
          component.id === componentId
            ? { ...component, visible: component.visible !== false ? false : true }
            : component
        ),
      }));
      return {
        ...prev,
        sections: updatedSections,
      };
    });
    markAsChanged();
  };

  const handleAddComponent = (sectionId: string) => {
    setAddingComponentSectionId(sectionId);
  };

  const handleSavePortfolio = useCallback(async () => {
    if (!portfolioData || !user?.user_id) {
      console.warn("No portfolio data or user available");
      return;
    }

    const toastId = toast.loading("Saving sections...");

    try {
      setSaving(true);
      setError(null);

      if (portfolioId) {
        // Update existing portfolio
        await PortfolioApiClient.updatePortfolio(portfolioId, {
          sections: portfolioData.sections,
        });
      } else {
        // Create new portfolio
        const newPortfolio = await PortfolioApiClient.createPortfolio(portfolioData);
        setPortfolioId(newPortfolio.id);
      }

      toast.success("Sections saved successfully!", { id: toastId });
      console.log("Sections saved successfully");

      // Mark as saved with the current portfolio data
      markAsSaved(portfolioData);
    } catch (err) {
      console.error("Failed to save sections:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save sections";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [portfolioData, portfolioId, user?.user_id, setSaving, markAsSaved]);

  const handlePublishPortfolio = useCallback(async () => {
    if (!portfolioId || !user?.user_id) {
      toast.error("No portfolio available to publish");
      return;
    }

    // Validate draft data before publishing
    const sectionCount = portfolioData.sections?.length || 0;
    const componentCount =
      portfolioData.sections?.reduce((sum, section) => sum + (section.components?.length || 0), 0) || 0;

    if (sectionCount < 1) {
      toast.error("Portfolio must have at least 1 section to publish");
      return;
    }

    if (componentCount < 1) {
      toast.error("Portfolio must have at least 1 component in sections to publish");
      return;
    }

    const toastId = toast.loading("Publishing portfolio...");

    try {
      setPublishing(true);

      // First save any pending changes
      await PortfolioApiClient.updatePortfolio(portfolioId, {
        sections: portfolioData.sections,
      });

      // Then publish
      const response = await fetch(`/api/v1/portfolios/${portfolioId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Publish failed" }));
        throw new Error(error.error?.message || error.message || "Failed to publish portfolio");
      }

      toast.success("Portfolio published successfully!", { id: toastId });
      console.log("Portfolio published successfully");

      // Mark as published
      markAsPublished(new Date().toISOString());
    } catch (err) {
      console.error("Failed to publish portfolio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to publish portfolio";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setPublishing(false);
    }
  }, [portfolioData, portfolioId, user?.user_id, setPublishing, markAsPublished]);

  const handleAddSection = useCallback(() => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      title: "New Section",
      slug: `new-section-${Date.now()}`,
      description: "",
      visible: true,
      components: [],
    };

    setPortfolioData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    markAsChanged();
  }, [markAsChanged]);

  // Set up event listeners for parent component actions and change tracker refs
  useEffect(() => {
    const handleSaveEvent = () => handleSavePortfolio();
    const handlePublishEvent = () => handlePublishPortfolio();

    window.addEventListener("saveSections", handleSaveEvent);
    window.addEventListener("publishSections", handlePublishEvent);

    // Set refs in change tracker
    saveSectionsRef.current = handleSavePortfolio;
    publishRef.current = handlePublishPortfolio;

    return () => {
      window.removeEventListener("saveSections", handleSaveEvent);
      window.removeEventListener("publishSections", handlePublishEvent);
    };
  }, [handleSavePortfolio, handlePublishPortfolio, saveSectionsRef, publishRef]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveType(active.data.current?.type || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle section reordering
    if (active.data.current?.type === "section" && over.data.current?.type === "section") {
      setPortfolioData((prev) => {
        const oldIndex = prev.sections.findIndex((section) => section.id === activeId);
        const newIndex = prev.sections.findIndex((section) => section.id === overId);

        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
      markAsChanged();
    }

    // Handle component reordering within sections
    if (active.data.current?.type === "component" && over.data.current?.type === "component") {
      const activeSectionId = active.data.current.sectionId;
      const overSectionId = over.data.current.sectionId;

      if (activeSectionId === overSectionId) {
        // Reordering within the same section
        setPortfolioData((prev) => {
          const sectionIndex = prev.sections.findIndex((section) => section.id === activeSectionId);
          if (sectionIndex === -1) return prev;

          const section = prev.sections[sectionIndex];
          const oldIndex = section.components.findIndex((component) => component.id === activeId);
          const newIndex = section.components.findIndex((component) => component.id === overId);

          const updatedSection = {
            ...section,
            components: arrayMove(section.components, oldIndex, newIndex),
          };

          const updatedSections = [...prev.sections];
          updatedSections[sectionIndex] = updatedSection;

          return {
            ...prev,
            sections: updatedSections,
          };
        });
        markAsChanged();
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error && !portfolioData) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Portfolio</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const collisionDetection: CollisionDetection = (args) => {
    // Custom collision detection logic can be added here if needed
    return closestCenter(args);
  };

  // Format timestamps for display
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Portfolio Editor</h1>
            <p className="text-muted-foreground">Create and organize the sections and components of your portfolio.</p>

            {/* Timestamp info */}
            <div className="text-[10px] font-mono text-muted mt-4 space-y-1">
              <div>Last saved: {formatTimestamp(portfolioState.lastSavedAt)}</div>
              {portfolioState.lastPublishedAt && (
                <div>Last published: {formatTimestamp(portfolioState.lastPublishedAt)}</div>
              )}
            </div>
          </div>
          <Button onClick={handleAddSection} variant="outline" className="gap-2" aria-label="Add new section">
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {portfolioData.sections.length === 0 ? (
            <EmptySections onAddSection={handleAddSection} />
          ) : (
            portfolioData.sections.map((section) => (
              <SectionContent
                key={section.id}
                sections={[section]}
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
            ))
          )}
        </div>

        <DragOverlay>
          {activeId ? <DragOverlayContent activeId={activeId} sections={portfolioData.sections} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
