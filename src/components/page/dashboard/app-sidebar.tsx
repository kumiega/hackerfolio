import * as React from "react";
import { PanelsTopLeft, Settings2 } from "lucide-react";

import { NavMain } from "@/components/page/dashboard/nav-main";
import { NavUser } from "@/components/page/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";

const data = {
  navMain: [
    {
      title: "Editor",
      url: "/dashboard/editor",
      icon: PanelsTopLeft,
      isActive: false,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
      isActive: false,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPath?: string;
}

export function AppSidebar({ currentPath, ...props }: AppSidebarProps) {
  // Update nav items with active state based on current path
  const navItems = data.navMain.map((item) => ({
    ...item,
    isActive: currentPath === item.url,
  }));

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <a href="/dashboard">
              <Logo className="text-base sm:text-lg mx-2 pt-0.5" />
            </a>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>UserAvatar</SidebarMenuItem>

        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
