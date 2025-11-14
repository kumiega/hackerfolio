"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CheckboxCard } from "@/components/ui/checkbox-card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { GitHubRepoDto, Component } from "@/types";

interface RepoSelectorProps {
  repositories: GitHubRepoDto[];
  onSelectionComplete: () => void;
  onSkip: () => void;
  userId: string;
}

function RepoSelector({ repositories, onSelectionComplete, onSkip, userId }: RepoSelectorProps) {
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load existing portfolio data to check what projects are already selected
  useEffect(() => {
    const loadExistingSelections = async () => {
      try {
        const response = await fetch(`/api/v1/portfolios/user/${userId}`);
        if (response.ok) {
          const data = await response.json();
          const portfolio = data.data;

          // Check if there's already a projects section with selected repos
          const projectsSection = portfolio.draft_data.sections?.find((section: any) => section.slug === "projects");

          if (projectsSection?.components?.length > 0) {
            // Extract repo URLs from existing project cards
            const existingRepoUrls = new Set(
              projectsSection.components
                .filter((component: any) => component.type === "cards")
                .flatMap((component: any) => component.data.cards || [])
                .map((card: any) => card.repo_url)
            );

            // Mark repositories as selected if they exist in the portfolio
            const selectedIds = new Set<number>();
            repositories.forEach((repo) => {
              if (existingRepoUrls.has(repo.html_url)) {
                selectedIds.add(repo.id);
              }
            });
            setSelectedRepos(selectedIds);
          }
        }
      } catch (error) {
        console.error("Failed to load existing portfolio data:", error);
      }
    };

    if (repositories.length > 0) {
      loadExistingSelections();
    }
  }, [repositories, userId]);

  const handleRepoToggle = (repoId: number, checked: boolean) => {
    const newSelected = new Set(selectedRepos);
    if (checked) {
      newSelected.add(repoId);
    } else {
      newSelected.delete(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleSaveSelection = async () => {
    if (selectedRepos.size === 0) {
      toast.error("Please select at least one repository");
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Generate description for the projects section
      console.log("Making request to generate-description API...");
      const descriptionResponse = await fetch("/api/v1/ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("API response status:", descriptionResponse.status);
      console.log("API response ok:", descriptionResponse.ok);

      if (!descriptionResponse.ok) {
        console.log("API response not ok, trying to parse error...");
        let errorMessage = `Description generation failed: HTTP ${descriptionResponse.status}`;

        try {
          const errorData = await descriptionResponse.json();
          console.log("Error data:", errorData);
          if (errorData.error?.message) {
            errorMessage = `Description generation failed: ${errorData.error.message}`;
          }
        } catch (parseError) {
          console.log("Failed to parse error response as JSON:", parseError);
          // Don't try to read the body again since it's already consumed
          console.log("Response status:", descriptionResponse.status);
          console.log("Response headers:", Object.fromEntries(descriptionResponse.headers.entries()));
        }

        throw new Error(errorMessage);
      }

      const descriptionData = await descriptionResponse.json();
      const sectionDescription = descriptionData.data.description;

      // Step 2: Get selected repository data
      const selectedRepoData = repositories.filter((repo) => selectedRepos.has(repo.id));

      // Step 3: Generate project cards for selected repositories
      const cardsResponse = await fetch("/api/v1/imports/github/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_urls: selectedRepoData.map((repo) => repo.html_url),
          limit: 10,
        }),
      });

      if (!cardsResponse.ok) {
        const errorData = await cardsResponse.json();
        throw new Error(`Card generation failed: ${errorData.error?.message || "Unknown error"}`);
      }

      const cardData = await cardsResponse.json();

      // Step 4: Create text component for section description
      const textComponent: Component = {
        id: crypto.randomUUID(),
        type: "text",
        data: {
          content: sectionDescription,
        },
        visible: true,
      };

      // Step 5: Update portfolio with the generated components
      await updatePortfolioWithProjects([textComponent, ...cardData.data.components]);

      console.log("About to show success toast");
      toast.success(
        `Successfully added ${selectedRepos.size} project${selectedRepos.size > 1 ? "s" : ""} to your portfolio`
      );
      console.log("Success toast shown");
      console.log("About to call onSelectionComplete");
      onSelectionComplete();
      console.log("onSelectionComplete called successfully");
    } catch (error) {
      console.error("Failed to save project selection:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        errorMessage = JSON.stringify(error);
      }

      toast.error(`Failed to save project selection: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePortfolioWithProjects = async (components: Component[]) => {
    // First, get the current portfolio
    const portfolioResponse = await fetch("/api/v1/portfolios/me");
    if (!portfolioResponse.ok) {
      throw new Error("Failed to fetch current portfolio");
    }

    const portfolioData = await portfolioResponse.json();
    const currentPortfolio = portfolioData.data;

    // Find or create projects section
    let projectsSection = currentPortfolio.draft_data.sections?.find((section: any) => section.slug === "projects");

    if (!projectsSection) {
      // Create new projects section
      projectsSection = {
        id: crypto.randomUUID(),
        title: "Projects",
        slug: "projects",
        visible: true,
        components: [],
      };

      if (!currentPortfolio.draft_data.sections) {
        currentPortfolio.draft_data.sections = [];
      }
      currentPortfolio.draft_data.sections.push(projectsSection);
    }

    // Clear existing projects components and add new ones
    // This ensures we don't duplicate components if the user runs this multiple times
    projectsSection.components = components;

    // Update the portfolio
    console.log("Updating portfolio with ID:", currentPortfolio.id);
    console.log("Portfolio draft_data:", JSON.stringify(currentPortfolio.draft_data, null, 2));

    const updateResponse = await fetch(`/api/v1/portfolios/${currentPortfolio.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft_data: currentPortfolio.draft_data,
      }),
    });

    console.log("Portfolio update response status:", updateResponse.status);

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error("Portfolio update failed:", errorData);
      throw new Error(errorData.error?.message || "Failed to update portfolio");
    }

    console.log("Portfolio update successful");
  };

  if (repositories.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No repositories found to select from.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScrollArea className="h-96 border">
        <div className="space-y-3 py-3 px-3">
          {repositories.map((repo) => (
            <CheckboxCard
              key={repo.id}
              repo={repo}
              checked={selectedRepos.has(repo.id)}
              onCheckedChange={(checked) => handleRepoToggle(repo.id, checked)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedRepos.size} of {repositories.length} repositories selected
        </div>
        <div className="flex gap-4">
          <Button variant="link" onClick={onSkip}>
            Skip import
          </Button>
          <Button onClick={handleSaveSelection} disabled={isSaving || selectedRepos.size === 0}>
            {isSaving ? "Saving..." : `Add ${selectedRepos.size} Project${selectedRepos.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { RepoSelector };
