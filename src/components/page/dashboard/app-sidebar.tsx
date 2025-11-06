import * as React from "react";
import { Settings2, User as UserIcon, FileText, LogOut, Palette } from "lucide-react";
import { Link } from "react-router";

import { Nav } from "@/components/page/dashboard/nav";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { User } from "@/types";

const nav = {
  portfolio: [
    {
      title: "Bio",
      url: "/dashboard/bio",
      icon: UserIcon,
    },
    {
      title: "Sections",
      url: "/dashboard/editor",
      icon: FileText,
    },
  ],
  user: [
    {
      title: "Theme",
      url: "/dashboard/theme",
      icon: Palette,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: User;
  currentPath?: string;
}

export function AppSidebar({ user, currentPath, ...props }: AppSidebarProps) {
  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/dashboard">
              <Logo className="text-base sm:text-lg mx-2 pt-0.5" />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <Nav label="Portfolio" items={nav.portfolio} currentPath={currentPath || "/dashboard"} />
        <SidebarSeparator />
        <Nav label="User" items={nav.user} currentPath={currentPath || "/dashboard"} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserAvatar user={user ?? null} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form method="POST" action="/api/v1/auth/signout">
              <SidebarMenuButton type="submit" tooltip="Log out" className="w-full">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
