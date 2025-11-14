
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
import { usePortfolioChangeTracker } from "@/components/page/dashboard/portfolio-change-tracker";
import { validateSectionsData } from "@/lib/validation";

import { EmptySections } from "./empty-sections";
import { DragOverlayContent } from "./drag-overlay-content";
import { SectionContent } from "./section-content";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { toast } from "sonner";

// Default empty bio structure
const defaultBioData = {
  full_name: "",
  position: "",
  summary: "",
  avatar_url: "",
  social_links: {
    github: "",
    linkedin: "",
    x: "",
    website: [],
  },
};

// Default empty portfolio structure
const defaultPortfolioData: PortfolioData = {
  bio: defaultBioData,
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

  async getPortfolio(): Promise<PortfolioDto> {
    const response = await fetch(`/api/v1/portfolios/me`, {
      method: "GET",
    });
    return this.handleResponse<PortfolioDto>(response);
  },

  async updatePortfolio(id: string, command: { draft_data: Partial<PortfolioData> }): Promise<PortfolioData> {
    const response = await fetch(`/api/v1/portfolios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the global change tracker
  const {
    markAsChanged,
    markAsSaved,
    markAsPublished,
    setInitialState,
    setValidForSave,
    updatePortfolioData,
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

  const validateSections = useCallback(
    (portfolioData: PortfolioData) => {
      const validation = validateSectionsData(portfolioData);
      setValidForSave(validation.isValid);
      return validation;
    },
    [setValidForSave]
  );

  // Load portfolio data on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const portfolio = await PortfolioApiClient.getPortfolio();

        // Ensure all sections have valid slugs
        const processedData = {
          ...portfolio.draft_data,
          sections: portfolio.draft_data.sections.map((section) => ({
            ...section,
            slug:
              section.slug ||
              section.title
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "") ||
              `section-${section.id}`,
          })),
        };

        setPortfolioData(processedData);
        setPortfolioId(portfolio.id);

        // Set initial state in change tracker
        setInitialState(processedData, portfolio.updated_at || undefined, portfolio.last_published_at || undefined);
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load portfolio";

        // If portfolio doesn't exist, use default empty structure
        if (errorMessage.includes("not found")) {
          setPortfolioData(defaultPortfolioData);
          // Set initial state for new users with unsaved changes
          setInitialState(defaultPortfolioData, undefined, undefined);
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [user.user_id, setInitialState]);

  // Validate sections data when it changes
  useEffect(() => {
    if (portfolioData) {
      validateSections(portfolioData);
    }
  }, [portfolioData, validateSections]);

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    setPortfolioData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
    }));
    markAsChanged();
  };

  const handleDeleteSection = (sectionId: string) => {
    setPortfolioData((prev) => {
      const updatedData = {
        ...prev,
        sections: prev.sections.filter((section) => section.id !== sectionId),
      };
      updatePortfolioData(updatedData);
      return updatedData;
    });
    markAsChanged();
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    setPortfolioData((prev) => {
      const updatedData = {
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId ? { ...section, visible: !section.visible } : section
        ),
      };
      updatePortfolioData(updatedData);
      return updatedData;
    });
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
        const updatedData = {
          ...prev,
          sections: updatedSections,
        };
        updatePortfolioData(updatedData);
        return updatedData;
      });
      setEditingComponentId(null);
      markAsChanged();
    },
    [markAsChanged, updatePortfolioData]
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
        const updatedData = {
          ...prev,
          sections: updatedSections,
        };
        updatePortfolioData(updatedData);
        return updatedData;
      });
      setAddingComponentSectionId(null);
      markAsChanged();
    },
    [addingComponentSectionId, markAsChanged, updatePortfolioData]
  );

  const handleDeleteComponent = (componentId: string) => {
    setPortfolioData((prev) => {
      const updatedSections = prev.sections.map((section) => ({
        ...section,
        components: section.components.filter((component) => component.id !== componentId),
      }));
      const updatedData = {
        ...prev,
        sections: updatedSections,
      };
      updatePortfolioData(updatedData);
      return updatedData;
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

    // Validate before saving
    const validation = validateSectionsData(portfolioData);
    if (!validation.isValid) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    const toastId = toast.loading("Saving sections...");

    try {
      setSaving(true);
      setError(null);

      if (portfolioId) {
        // Update existing portfolio
        await PortfolioApiClient.updatePortfolio(portfolioId, {
          draft_data: {
            sections: portfolioData.sections,
          },
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

    if (!portfolioData) {
      toast.error("No portfolio data available");
      return;
    }

    // Validate before publishing
    const validation = validateSectionsData(portfolioData);
    if (!validation.isValid) {
      toast.error("Please fix validation errors before publishing");
      return;
    }

    const toastId = toast.loading("Publishing portfolio...");

    try {
      setPublishing(true);

      // First save any pending changes
      await PortfolioApiClient.updatePortfolio(portfolioId, {
        draft_data: {
          sections: portfolioData.sections,
        },
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

    setPortfolioData((prev) => {
      const updatedData = {
        ...prev,
        sections: [...prev.sections, newSection],
      };
      updatePortfolioData(updatedData);
      return updatedData;
    });
    markAsChanged();
  }, [markAsChanged, updatePortfolioData]);

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
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle section reordering
    if (active.data.current?.type === "section" && over.data.current?.type === "section") {
      setPortfolioData((prev) => {
        const oldIndex = prev.sections.findIndex((section) => section.id === activeId);
        const newIndex = prev.sections.findIndex((section) => section.id === overId);

        const updatedData = {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
        updatePortfolioData(updatedData);
        return updatedData;
      });
      markAsChanged();
    }

    // Handle component reordering within sections or moving between sections
    if (active.data.current?.type === "component") {
      const activeSectionId = active.data.current.sectionId;

      // Component dropped on another component (reordering within section or between sections)
      if (over.data.current?.type === "component") {
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

            const updatedData = {
              ...prev,
              sections: updatedSections,
            };
            updatePortfolioData(updatedData);
            return updatedData;
          });
          markAsChanged();
        } else {
          // Moving component between different sections
          setPortfolioData((prev) => {
            const activeSectionIndex = prev.sections.findIndex((section) => section.id === activeSectionId);
            const overSectionIndex = prev.sections.findIndex((section) => section.id === overSectionId);

            if (activeSectionIndex === -1 || overSectionIndex === -1) return prev;

            const activeSection = prev.sections[activeSectionIndex];
            const overSection = prev.sections[overSectionIndex];

            // Find the component to move
            const componentIndex = activeSection.components.findIndex((component) => component.id === activeId);
            const overComponentIndex = overSection.components.findIndex((component) => component.id === overId);

            if (componentIndex === -1 || overComponentIndex === -1) return prev;

            const componentToMove = activeSection.components[componentIndex];

            // Remove component from active section
            const updatedActiveSection = {
              ...activeSection,
              components: activeSection.components.filter((component) => component.id !== activeId),
            };

            // Add component to over section at the position of the over component
            const updatedOverSection = {
              ...overSection,
              components: [
                ...overSection.components.slice(0, overComponentIndex),
                componentToMove,
                ...overSection.components.slice(overComponentIndex),
              ],
            };

            const updatedSections = [...prev.sections];
            updatedSections[activeSectionIndex] = updatedActiveSection;
            updatedSections[overSectionIndex] = updatedOverSection;

            const updatedData = {
              ...prev,
              sections: updatedSections,
            };
            updatePortfolioData(updatedData);
            return updatedData;
          });
          markAsChanged();
        }
      }
      // Component dropped on a section droppable area (moving to end of section)
      else if (over.data.current?.type === "section") {
        const targetSectionId = over.data.current.sectionId;

        if (activeSectionId !== targetSectionId) {
          // Moving component to a different section
          setPortfolioData((prev) => {
            const activeSectionIndex = prev.sections.findIndex((section) => section.id === activeSectionId);
            const targetSectionIndex = prev.sections.findIndex((section) => section.id === targetSectionId);

            if (activeSectionIndex === -1 || targetSectionIndex === -1) return prev;

            const activeSection = prev.sections[activeSectionIndex];
            const targetSection = prev.sections[targetSectionIndex];

            // Find the component to move
            const componentIndex = activeSection.components.findIndex((component) => component.id === activeId);
            if (componentIndex === -1) return prev;

            const componentToMove = activeSection.components[componentIndex];

            // Remove component from active section
            const updatedActiveSection = {
              ...activeSection,
              components: activeSection.components.filter((component) => component.id !== activeId),
            };

            // Add component to end of target section
            const updatedTargetSection = {
              ...targetSection,
              components: [...targetSection.components, componentToMove],
            };

            const updatedSections = [...prev.sections];
            updatedSections[activeSectionIndex] = updatedActiveSection;
            updatedSections[targetSectionIndex] = updatedTargetSection;

            const updatedData = {
              ...prev,
              sections: updatedSections,
            };
            updatePortfolioData(updatedData);
            return updatedData;
          });
          markAsChanged();
        }
      }
    }

    setActiveId(null);
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
            <h1 className="text-3xl font-bold tracking-tight mb-3">Sections</h1>
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
