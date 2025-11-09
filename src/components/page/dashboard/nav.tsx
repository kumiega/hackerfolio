"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
interface NavProps {
  label: string;
  items: {
    title: string;
    url?: string;
    onClick?: () => void;
    icon: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  currentPath?: string;
}

export function Nav({ label, items, currentPath = "/dashboard" }: NavProps) {
  // Map /dashboard to /dashboard/bio for navigation highlighting
  const normalizedPath = currentPath === "/dashboard" ? "/dashboard/bio" : currentPath;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isItemActive = item.url ? normalizedPath === item.url : false;
          const hasActiveSubItem = item.items?.some((subItem) => normalizedPath === subItem.url);
          const isExpanded = isItemActive || hasActiveSubItem;

          return (
            <Collapsible key={item.title} asChild defaultOpen={isExpanded}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild={!!item.url}
                  tooltip={item.title}
                  isActive={isItemActive}
                  disabled={item.disabled}
                  onClick={item.onClick}
                >
                  {item.url ? (
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  ) : (
                    <>
                      <item.icon />
                      <span>{item.title}</span>
                    </>
                  )}
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubItemActive = normalizedPath === subItem.url;
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
