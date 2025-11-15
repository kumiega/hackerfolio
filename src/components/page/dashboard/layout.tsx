import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { useState, useRef, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/page/dashboard/app-sidebar";
import { SiteHeader } from "@/components/page/dashboard/site-header";
import { Toaster } from "@/components/ui/sonner";
import { PortfolioChangeTrackerProvider } from "@/components/page/dashboard/portfolio-change-tracker";

import type { User } from "@/types";

// Import page components
import { BioEditorPage } from "@/components/page/dashboard/bio-editor-page";
import { SectionsEditorPage } from "@/components/page/dashboard/sections-editor-page";
import { SettingsPage } from "@/components/page/dashboard/settings-page";
import { ThemePage } from "@/components/page/dashboard/theme-page";

interface DashboardLayoutProps {
  user: User;
  currentPath?: string;
}

function DashboardContent({ user, currentPath }: { user: User; currentPath?: string }) {
  const location = useLocation();
  const actualCurrentPath = currentPath || location.pathname;

  // Hide the loading skeleton once React mounts
  useEffect(() => {
    const skeleton = document.getElementById("dashboard-skeleton");
    if (skeleton) {
      skeleton.style.display = "none";
    }
  }, []);

  // Determine if current page is an editor page
  const isEditorPage = actualCurrentPath === "/dashboard/bio" || actualCurrentPath === "/dashboard/editor";

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader currentPath={location.pathname} />
        <div className="flex flex-1">
          <AppSidebar user={user} currentPath={location.pathname} />
          <SidebarInset className="p-4 lg:p-14">
            <Routes>
              <Route path="/dashboard/bio" element={<BioEditorPage user={user} />} />
              <Route path="/dashboard/editor" element={<SectionsEditorPage user={user} />} />
              <Route
                path="/dashboard/settings"
                element={<SettingsPage user={user} currentPath="/dashboard/settings" />}
              />
              <Route path="/dashboard/theme" element={<ThemePage user={user} currentPath="/dashboard/theme" />} />
              <Route path="/dashboard" element={<BioEditorPage user={user} />} />
            </Routes>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <Toaster />
    </div>
  );
}

export function DashboardLayout({ user, currentPath }: DashboardLayoutProps) {
  return (
    <PortfolioChangeTrackerProvider>
      <BrowserRouter>
        <DashboardContent user={user} currentPath={currentPath} />
      </BrowserRouter>
    </PortfolioChangeTrackerProvider>
  );
}
