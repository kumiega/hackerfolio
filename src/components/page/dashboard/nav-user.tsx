"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

export function NavUser() {
  const { handleLogout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    try {
      setIsLoggingOut(true);
      await handleLogout();
    } catch {
      // Logout failed - user will stay logged in
      setIsLoggingOut(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleLogoutClick}
          disabled={isLoading || isLoggingOut}
          tooltip="Log out"
          className="w-full"
        >
          <LogOut />
          <span>Log out</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
