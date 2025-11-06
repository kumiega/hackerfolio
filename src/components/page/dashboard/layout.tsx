import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/page/dashboard/app-sidebar";
import { SiteHeader } from "@/components/page/dashboard/site-header";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  currentPath?: string;
}

export function DashboardLayout({ children, currentPath }: DashboardLayoutProps) {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader currentPath={currentPath} />
        <div className="flex flex-1">
          <AppSidebar currentPath={currentPath} />
          <SidebarInset>
            {children || (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                  <div className="bg-muted/50 aspect-video rounded-xl"></div>
                  <div className="bg-muted/50 aspect-video rounded-xl"></div>
                  <div className="bg-muted/50 aspect-video rounded-xl"></div>
                </div>
                <div className="bg-muted/50 min-h-screen flex-1 rounded-xl md:min-h-min"></div>
              </div>
            )}
          </SidebarInset>
        </div>
      </SidebarProvider>
      <Toaster />
    </div>
  );
}
