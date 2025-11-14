import { SidebarIcon, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/page/dashboard/breadcrumbs";
import { Spinner } from "@/components/ui/spinner";
import { usePortfolioChangeTracker } from "@/components/page/dashboard/portfolio-change-tracker";
import { ModeToggle } from "@/components/ui/mode-toggle";

interface SiteHeaderProps {
  currentPath?: string;
}

export function SiteHeader({ currentPath }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const { saveBioRef, saveSectionsRef, publishRef, isSaving, isPublishing, portfolioState } =
    usePortfolioChangeTracker();

  const handleSavePortfolio = () => {
    // Try bio save first, then sections save
    if (saveBioRef.current) {
      saveBioRef.current();
    } else if (saveSectionsRef.current) {
      saveSectionsRef.current();
    }
  };

  const handlePublishPortfolio = () => {
    if (publishRef.current) {
      publishRef.current();
    }
  };

  // Show editor buttons only on bio and sections editor pages
  const isEditorPage = currentPath === "/dashboard/bio" || currentPath === "/dashboard/editor";

  // Check if required bio fields are filled to show save/publish buttons
  const hasRequiredBioFields = !!(
    portfolioState.data?.bio?.full_name?.trim() &&
    portfolioState.data?.bio?.position?.trim() &&
    portfolioState.data?.bio?.summary?.trim()
  );

  return (
    <header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar}>
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs pathname={currentPath} />
        <div className="ml-auto flex items-center gap-2">
          {isEditorPage && (
            <>
              {hasRequiredBioFields && (
                <Button
                  variant="muted"
                  onClick={handleSavePortfolio}
                  disabled={isSaving}
                  className="gap-2 min-w-36 transition-all duration-200"
                  aria-label={isSaving ? "Saving portfolio changes" : "Save portfolio changes"}
                >
                  {isSaving ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save draft
                    </>
                  )}
                </Button>
              )}

              {/* Publish button */}
              {hasRequiredBioFields && (
                <Button
                  onClick={handlePublishPortfolio}
                  disabled={isPublishing || isSaving}
                  className="gap-2 min-w-36 transition-all duration-200"
                  variant="default"
                  aria-label={isPublishing ? "Publishing portfolio" : "Publish portfolio"}
                >
                  {isPublishing ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* Theme toggle - always visible */}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
