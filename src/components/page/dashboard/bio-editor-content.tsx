import { useState, useEffect, useCallback } from "react";

import type {
  BioData,
  PortfolioData,
  PortfolioDto,
  User,
  UpdatePortfolioCommand,
  CreatePortfolioCommand,
} from "@/types";
import { usePortfolioChangeTracker } from "@/components/page/dashboard/portfolio-change-tracker";
import { validateBioData, type BioValidationResult } from "@/lib/validation";

import { BioSection } from "./bio-section";
import { Spinner } from "@/components/ui/spinner";

import { toast } from "sonner";

// Default empty bio structure
const defaultBioData: BioData = {
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

  async updatePortfolio(id: string, command: UpdatePortfolioCommand): Promise<PortfolioData> {
    const response = await fetch(`/api/v1/portfolios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    return this.handleResponse<PortfolioData>(response);
  },

  async createPortfolio(command: CreatePortfolioCommand): Promise<{ id: string }> {
    const response = await fetch("/api/v1/portfolios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    return this.handleResponse<{ id: string }>(response);
  },
};

interface BioEditorContentProps {
  user: User;
}

export function BioEditorContent({ user }: BioEditorContentProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<BioValidationResult["fieldErrors"]>({});

  // Use the global change tracker
  const {
    markAsChanged,
    markAsSaved,
    markAsPublished,
    setInitialState,
    setValidForSave,
    updatePortfolioData,
    saveBioRef,
    publishRef,
    setSaving,
    setPublishing,
    portfolioState,
  } = usePortfolioChangeTracker();

  // Load portfolio data on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const portfolio = await PortfolioApiClient.getPortfolio();

        // Handle data migration from old format (bio as array) to new format (bio as object)
        const draftData = portfolio.draft_data;
        let bioData: BioData;

        if (Array.isArray(draftData.bio)) {
          // Old format: bio is an array of components
          const bioComponents = draftData.bio || [];
          const personalInfo = bioComponents.find((c) => c.type === "personal_info");
          const textComponent = bioComponents.find((c) => c.type === "text");
          const avatarComponent = bioComponents.find((c) => c.type === "avatar");
          const socialLinksComponent = bioComponents.find((c) => c.type === "social_links");

          bioData = {
            full_name: personalInfo?.data?.full_name || "",
            position: personalInfo?.data?.position || "",
            summary: textComponent?.data?.content || "",
            avatar_url: avatarComponent?.data?.avatar_url || draftData.avatar_url || "",
            social_links: socialLinksComponent?.data || defaultBioData.social_links,
          };
        } else if (typeof draftData.bio === "object" && draftData.bio !== null) {
          // New format: bio is already an object
          bioData = {
            ...defaultBioData,
            ...draftData.bio,
          };
        } else {
          // Fallback
          bioData = defaultBioData;
        }

        // Ensure social_links always exists (for backward compatibility)
        const normalizedBioData = {
          ...bioData,
          social_links: bioData.social_links || defaultBioData.social_links,
        };

        const initialData = {
          bio: normalizedBioData,
          sections: portfolio.draft_data.sections || [],
        };

        setPortfolioData(initialData);
        setPortfolioId(portfolio.id);

        // Set initial state in change tracker
        setInitialState(initialData, portfolio.updated_at || undefined, portfolio.last_published_at || undefined);
      } catch (err) {
        console.error("Failed to load portfolio:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load portfolio";

        // If portfolio doesn't exist, create with default bio
        if (errorMessage.includes("not found")) {
          const defaultData = {
            bio: { ...defaultBioData }, // Ensure we have a copy
            sections: [],
          };
          setPortfolioData(defaultData);
          // Set initial state for new users with unsaved changes
          setInitialState(defaultData, undefined, undefined);
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [user.user_id, setInitialState]);

  const validateBio = useCallback(
    (bioData: BioData) => {
      const validation = validateBioData(bioData);
      setValidationErrors(validation.fieldErrors);
      setValidForSave(validation.isValid);
      return validation;
    },
    [setValidForSave]
  );

  // Validate bio data when it changes
  useEffect(() => {
    if (portfolioData?.bio) {
      validateBio(portfolioData.bio);
    }
  }, [portfolioData?.bio, validateBio]);

  const handleUpdateBio = useCallback(
    (updates: Partial<BioData>) => {
      setPortfolioData((prev) => {
        if (!prev) return prev;
        const updatedBio = {
          ...prev.bio,
          ...updates,
        };
        // Validate after update
        setTimeout(() => validateBio(updatedBio), 0);
        const updatedData = {
          ...prev,
          bio: updatedBio,
        };
        // Update global portfolio state
        updatePortfolioData(updatedData);
        return updatedData;
      });
      markAsChanged();
    },
    [markAsChanged, validateBio, updatePortfolioData]
  );

  const handleSavePortfolio = useCallback(async () => {
    if (!portfolioData || !user?.user_id) {
      console.warn("No portfolio data or user available");
      return;
    }

    // Validate before saving
    const validation = validateBioData(portfolioData.bio);
    if (!validation.isValid) {
      toast.error("Please fix validation errors before saving");
      setValidationErrors(validation.fieldErrors);
      return;
    }

    const toastId = toast.loading("Saving bio...");

    try {
      setSaving(true);
      setError(null);

      if (portfolioId) {
        // Update existing portfolio
        await PortfolioApiClient.updatePortfolio(portfolioId, {
          draft_data: {
            bio: portfolioData.bio,
          },
        });
      } else {
        // Create new portfolio
        const newPortfolio = await PortfolioApiClient.createPortfolio({
          draft_data: {
            bio: portfolioData.bio,
            sections: portfolioData.sections,
          },
        });
        setPortfolioId(newPortfolio.id);
      }

      toast.success("Bio saved successfully!", { id: toastId });
      console.log("Bio saved successfully");

      // Mark as saved with the current portfolio data
      if (portfolioData) {
        markAsSaved(portfolioData);
      }
    } catch (err) {
      console.error("Failed to save bio:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save bio";
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
    const validation = validateBioData(portfolioData.bio);
    if (!validation.isValid) {
      toast.error("Please fix validation errors before publishing");
      setValidationErrors(validation.fieldErrors);
      return;
    }

    const toastId = toast.loading("Publishing portfolio...");

    try {
      setPublishing(true);

      // First save any pending changes
      if (!portfolioData) {
        throw new Error("No portfolio data available");
      }
      await PortfolioApiClient.updatePortfolio(portfolioId, {
        draft_data: {
          bio: portfolioData.bio,
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

  // Set refs in change tracker
  useEffect(() => {
    saveBioRef.current = handleSavePortfolio;
    publishRef.current = handlePublishPortfolio;
  }, [handleSavePortfolio, handlePublishPortfolio, saveBioRef, publishRef]);

  // Listen for custom events dispatched by parent
  useEffect(() => {
    const handleSaveEvent = () => handleSavePortfolio();
    const handlePublishEvent = () => handlePublishPortfolio();

    window.addEventListener("saveBio", handleSaveEvent);
    window.addEventListener("publishBio", handlePublishEvent);

    return () => {
      window.removeEventListener("saveBio", handleSaveEvent);
      window.removeEventListener("publishBio", handlePublishEvent);
    };
  }, [handleSavePortfolio, handlePublishPortfolio]);

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

  // Format timestamps for display
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Personal info</h1>
        <p className="text-muted-foreground">
          Customize your personal information, avatar, social links, and bio text.
        </p>

        {/* Timestamp info */}
        <div className="text-[12px] font-mono text-muted  mt-4 space-y-1">
          <div>Last saved: {formatTimestamp(portfolioState.lastSavedAt)}</div>
          {portfolioState.lastPublishedAt && (
            <div>Last published: {formatTimestamp(portfolioState.lastPublishedAt)}</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <BioSection bio={portfolioData.bio} onUpdateBio={handleUpdateBio} validationErrors={validationErrors} />
      </div>
    </div>
  );
}
