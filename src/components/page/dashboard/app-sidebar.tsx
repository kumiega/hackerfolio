import * as React from "react";
import { Settings2, User as UserIcon, FileText, LogOut, Palette, EyeIcon, KeyRound } from "lucide-react";
import { Link } from "react-router";

import { Nav } from "@/components/page/dashboard/nav";
import { usePortfolioChangeTracker } from "@/components/feature/dashboard/portfolio-change-tracker";
import type { PortfolioData } from "@/types";

interface PortfolioState {
  data: PortfolioData | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
}

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

const getPortfolioNavItems = (
  user: User | undefined,
  portfolioState: PortfolioState,
  handleDraftPreview: () => void,
  handlePreview: () => void
) => [
  {
    title: "Personal info",
    url: "/dashboard/bio",
    icon: UserIcon,
  },
  {
    title: "Sections",
    url: "/dashboard/editor",
    icon: FileText,
  },
  {
    title: "Draft Preview",
    onClick: handleDraftPreview,
    icon: KeyRound,
    disabled: !user?.username,
  },
  ...(portfolioState.lastPublishedAt
    ? [
        {
          title: "Published Preview",
          onClick: handlePreview,
          icon: EyeIcon,
          disabled: !user?.username,
        },
      ]
    : []),
];

const nav = {
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
  const { portfolioState } = usePortfolioChangeTracker();

  const handlePreview = () => {
    if (user?.username) {
      window.open(`/preview/${user.username}`, "_blank");
    }
  };

  const handleDraftPreview = () => {
    if (user?.username) {
      window.open(`/preview/${user.username}?draft=true`, "_blank");
    }
  };

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
        <Nav
          label="Portfolio"
          items={getPortfolioNavItems(user, portfolioState, handleDraftPreview, handlePreview)}
          currentPath={currentPath || "/dashboard"}
        />
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
