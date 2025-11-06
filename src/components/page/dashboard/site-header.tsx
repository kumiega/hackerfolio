import { SidebarIcon, EyeIcon, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/page/dashboard/breadcrumbs";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/types";

interface SiteHeaderProps {
  currentPath?: string;
  user?: User;
  onSavePortfolio?: () => void;
  onPublishPortfolio?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
}

export function SiteHeader({
  currentPath,
  user,
  onSavePortfolio,
  onPublishPortfolio,
  isSaving = false,
  isPublishing = false,
}: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar();

  const handlePreview = () => {
    if (user?.username) {
      window.open(`/preview/${user.username}`, "_blank");
    }
  };

  // Show editor buttons only on bio and sections editor pages
  const isEditorPage = currentPath === "/dashboard/bio" || currentPath === "/dashboard/editor";

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
              {onSavePortfolio && (
                <Button
                  variant="muted"
                  onClick={onSavePortfolio}
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
              {onPublishPortfolio && (
                <Button
                  onClick={onPublishPortfolio}
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
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={handlePreview}
            disabled={!user?.username}
            title="Preview portfolio"
          >
            <EyeIcon />
          </Button>
        </div>
      </div>
    </header>
  );
}
