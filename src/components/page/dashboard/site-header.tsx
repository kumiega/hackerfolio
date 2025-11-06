import { SidebarIcon, EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/page/dashboard/breadcrumbs";
import type { User } from "@/types";

interface SiteHeaderProps {
  currentPath?: string;
  user?: User;
}

export function SiteHeader({ currentPath, user }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar();

  const handlePreview = () => {
    if (user?.username) {
      window.open(`/preview/${user.username}`, "_blank");
    }
  };

  return (
    <header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar}>
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs currentPath={currentPath} />
        <div className="ml-auto flex items-center gap-2">
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
