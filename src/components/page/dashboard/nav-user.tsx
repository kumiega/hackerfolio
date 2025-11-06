"use client";

import { LogOut } from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <form method="POST" action="/api/v1/auth/signout">
          <SidebarMenuButton type="submit" tooltip="Log out" className="w-full">
            <LogOut />
            <span>Log out</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
