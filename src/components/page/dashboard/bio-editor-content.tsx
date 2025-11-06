"use client";

import { useState, useEffect, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

import type { Component, PortfolioData, User } from "@/types";

import { BioSection } from "./components/bio-section";
import { Spinner } from "@/components/ui/spinner";

import { toast } from "sonner";

// Default empty bio structure
const defaultBioComponents: Component[] = [
  {
    id: "default-personal-info",
    type: "personal_info",
    data: {
      full_name: "",
      position: "",
    },
    visible: true,
  },
  {
    id: "default-avatar",
    type: "avatar",
    data: {
      avatar_url: "",
    },
    visible: true,
  },
  {
    id: "default-social-links",
    type: "social_links",
    data: {
      github: "",
      linkedin: "",
      x: "",
      website: [],
    },
    visible: true,
  },
  {
    id: "default-bio-text",
    type: "text",
    data: {
      content: "",
    },
    visible: true,
  },
];

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

interface BioEditorContentProps {
  user: User;
  onSavingChange?: (saving: boolean) => void;
  onPublishingChange?: (publishing: boolean) => void;
  onSaveRef?: (fn: () => void) => void;
  onPublishRef?: (fn: () => void) => void;
}

export function BioEditorContent({
  user,
  onSavingChange,
  onPublishingChange,
  onSaveRef,
  onPublishRef,
}: BioEditorContentProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load portfolio data on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const portfolio = await PortfolioApiClient.getPortfolio(user.user_id);

        // Extract bio components from draft_data or use defaults
        const bioComponents = portfolio.draft_data.bio && portfolio.draft_data.bio.length > 0 ? portfolio.draft_data.bio : defaultBioComponents;

        setPortfolioData({
          ...portfolio.draft_data,
          bio: bioComponents,
        });
        setPortfolioId(portfolio.id);
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load portfolio";

        // If portfolio doesn't exist, create with default bio
        if (errorMessage.includes("not found")) {
          setPortfolioData({
            full_name: "",
            position: "",
            bio: defaultBioComponents,
            avatar_url: null,
            sections: [],
          });
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [user.user_id]);

  const handleEditComponent = useCallback((componentId: string) => {
    setEditingComponentId(componentId);
  }, []);

  const handleSaveBioComponent = useCallback((component: Component) => {
    setPortfolioData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bio: prev.bio.map((c) => (c.id === component.id ? component : c)),
      };
    });
    setEditingComponentId(null);
  }, []);

  const handleToggleBioComponentVisibility = (componentId: string) => {
    setPortfolioData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bio: prev.bio.map((component) =>
          component.id === componentId
            ? { ...component, visible: component.visible !== false ? false : true }
            : component
        ),
      };
    });
  };

  const validateRequiredFields = () => {
    if (!portfolioData) return "No portfolio data available";

    // Check if personal info component has required fields
    const personalInfoComponent = portfolioData.bio.find((c) => c.type === "personal_info");
    if (!personalInfoComponent) {
      return "Personal info component is missing";
    }

    const personalInfoData = personalInfoComponent.data as { full_name?: string; position?: string };
    if (!personalInfoData.full_name?.trim()) {
      return "Full name is required";
    }

    // Check if text component has content
    const textComponent = portfolioData.bio.find((c) => c.type === "text");
    if (!textComponent) {
      return "Bio text component is missing";
    }

    const textData = textComponent.data as { content?: string };
    if (!textData.content?.trim()) {
      return "Bio text is required";
    }

    return null; // No validation errors
  };

  const handleSavePortfolio = useCallback(async () => {
    if (!portfolioData || !user?.user_id) {
      console.warn("No portfolio data or user available");
      return;
    }

    if (isSaving) {
      return; // Prevent multiple save operations
    }

    // Validate required fields
    const validationError = validateRequiredFields();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const toastId = toast.loading("Saving bio...");

    try {
      setIsSaving(true);
      onSavingChange?.(true);
      setError(null);

      if (portfolioId) {
        // Update existing portfolio
        await PortfolioApiClient.updatePortfolio(portfolioId, {
          bio: portfolioData.bio,
          full_name: portfolioData.full_name,
          position: portfolioData.position,
        });
      } else {
        // Create new portfolio
        const newPortfolio = await PortfolioApiClient.createPortfolio(portfolioData);
        setPortfolioId(newPortfolio.id);
      }

      toast.success("Bio saved successfully!", { id: toastId });
      console.log("Bio saved successfully");
    } catch (err) {
      console.error("Failed to save bio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save bio";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  }, [portfolioData, portfolioId, user?.user_id, isSaving, onSavingChange]);

  const handlePublishPortfolio = useCallback(async () => {
    if (!portfolioId || !user?.user_id) {
      toast.error("No portfolio available to publish");
      return;
    }

    if (isSaving) {
      return; // Prevent multiple operations
    }

    // Validate required fields
    const validationError = validateRequiredFields();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const toastId = toast.loading("Publishing portfolio...");

    try {
      setIsPublishing(true);
      onPublishingChange?.(true);

      // First save any pending changes
      await PortfolioApiClient.updatePortfolio(portfolioId, {
        bio: portfolioData!.bio,
        full_name: portfolioData!.full_name,
        position: portfolioData!.position,
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
    } catch (err) {
      console.error("Failed to publish portfolio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to publish portfolio";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setIsPublishing(false);
      onPublishingChange?.(false);
    }
  }, [portfolioData, portfolioId, user?.user_id, isSaving, onPublishingChange]);

  // Set refs for parent component to call functions
  useEffect(() => {
    onSaveRef?.(handleSavePortfolio);
    onPublishRef?.(handlePublishPortfolio);
  }, [onSaveRef, onPublishRef, handleSavePortfolio, handlePublishPortfolio]);

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
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Bio</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Bio Data</h3>
          <p className="text-muted-foreground">Unable to load bio information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Bio Editor</h1>
          <p className="text-muted-foreground">
            Customize your personal information, avatar, social links, and bio text.
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}>
          <div className="space-y-3">
            <BioSection
              bio={portfolioData.bio}
              editingComponentId={editingComponentId}
              onEditComponent={handleEditComponent}
              onSaveComponent={handleSaveBioComponent}
              onToggleComponentVisibility={handleToggleBioComponentVisibility}
            />
          </div>
        </DndContext>
      </div>
    </div>
  );
}
