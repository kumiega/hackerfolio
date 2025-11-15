import { toast } from "sonner";
import { useEffect, useState } from "react";

import { useStepper } from "@/components/ui/stepper";
import { repositories as repoService } from "@/lib/repositories";
import { createClientBrowser } from "@/db/supabase.client";

import type { QueryState, GitHubRepoDto } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { RepoSelector } from "./repo-selector";

function GitHubImportStep() {
  const [generationState, setGenerationState] = useState<QueryState>("idle");
  const [needsGitHubAuth, setNeedsGitHubAuth] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepoDto[]>([]);
  const { data } = useStepper<{ userId: string }, string>();
  const userId = data.userId;

  useEffect(() => {
    loadUserRepositories();
  }, []);

  const loadUserRepositories = async () => {
    try {
      setGenerationState("loading");

      // Make API call to fetch repositories
        const response = await fetch("/api/v1/imports/github/repos", {
          credentials: "include",
        });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if this is a GitHub token error
        if (errorData.error?.code === "GITHUB_TOKEN_INVALID") {
          setNeedsGitHubAuth(true);
          setGenerationState("idle");
          return;
        }

        throw new Error(errorData.error?.message || "Failed to fetch repositories");
      }

      const responseData = await response.json();
      setRepositories(responseData.data || []);
      setGenerationState("success");
      toast.success("Repositories imported successfully! You will be redirected to the dashboard in a moment.");
    } catch {
      setGenerationState("error");
      toast.error("Failed to fetch repositories");
    }
  };

  const handleComplete = async () => {
    console.log("handleComplete called - starting onboarding completion");
    try {
      const supabase = createClientBrowser();
      console.log("Created Supabase client");

      repoService.initialize(supabase);
      console.log("Initialized repositories");

      await repoService.userProfiles.update(userId, { is_onboarded: true });
      console.log("Updated user profile to onboarded");

      console.log("About to navigate to dashboard");
      // Small delay to ensure toast is visible before navigation
      setTimeout(() => {
        window.location.href = "/dashboard";
        console.log("Navigation to dashboard completed");
      }, 1500);
    } catch (error) {
      console.error("Error in handleComplete:", error);
      toast.error("Failed to complete onboarding");
    }
  };

  const handleSkip = async () => {
    const supabase = createClientBrowser();
    repoService.initialize(supabase);
    await repoService.userProfiles.update(userId, { is_onboarded: true });
    // Small delay to ensure any UI updates are visible before navigation
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Import your projects from GitHub</h1>
        <p className="text-sm text-muted-foreground">
          {needsGitHubAuth
            ? "Connect your GitHub account to import your projects and showcase your work."
            : "Select the projects you want to feature in your portfolio."}
        </p>
      </div>

      {generationState === "loading" && (
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="text-center">
            <Spinner className="mx-auto mb-4 h-8 w-8 text-primary" />
            <p className="text-muted-foreground">Loading your repositories...</p>
          </div>
        </div>
      )}

      {generationState === "success" && (
        <RepoSelector
          repositories={repositories}
          onSelectionComplete={handleComplete}
          onSkip={handleSkip}
          userId={userId}
        />
      )}
    </div>
  );
}

export { GitHubImportStep };
