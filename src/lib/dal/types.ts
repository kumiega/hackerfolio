/**
 * Type definitions for DAL return values
 */

export interface UserProfileDisplay {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PortfolioDisplay {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface PublicPortfolioDisplay {
  id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  username: string;
  sections: {
    id: string;
    name: string;
    position: number;
    components: {
      id: string;
      type: string;
      position: number;
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
