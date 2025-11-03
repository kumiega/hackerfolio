/**
 * Type definitions for DAL return values
 */

import type { PortfolioData } from "@/types";

export interface UserProfileDisplay {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PortfolioDisplay {
  id: string;
  user_id: string;
  draft_data: PortfolioData;
  published_data: PortfolioData | null;
  created_at: string;
  updated_at: string;
  last_published_at: string | null;
}

export interface PublicPortfolioDisplay {
  id: string;
  full_name: string;
  position: string;
  bio: {
    id: string;
    type: string;
    data: Record<string, unknown>;
  }[];
  avatar_url: string | null;
  published_at: string | null;
  username: string;
  sections: {
    id: string;
    title: string;
    slug: string;
    description: string;
    visible: boolean;
    components: {
      id: string;
      type: string;
      data: Record<string, unknown>;
    }[];
  }[];
}

export interface SectionDisplay {
  id: string;
  name: string;
  position: number;
  visible: boolean;
  created_at: string;
}

export interface ComponentDisplay {
  id: string;
  type: string;
  position: number;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface SessionDisplay {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
    is_onboarded: boolean;
  };
}
