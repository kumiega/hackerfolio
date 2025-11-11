// Shared types for backend and frontend (Entities, DTOs)
import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// Enums (mirroring component types)
// ============================================================================

export type ComponentType =
  | "text"
  | "cards"
  | "pills"
  | "social_links"
  | "list"
  | "image"
  | "bio"
  | "personal_info"
  | "avatar";

// ============================================================================
// Component Data Types (type-specific data structures)
// ============================================================================

export interface TextComponentData {
  content: string; // <= 2000 chars
}

export interface ProjectCardData {
  repo_url: string;
  title: string; // <= 100 chars
  summary: string; // <= 500 chars
  tech: string[];
}

export interface ProjectCardComponentData {
  cards: ProjectCardData[]; // Array of cards, max 10
}

export interface TechListComponentData {
  items: string[]; // <= 30 items, each <= 20 chars
}

export interface SocialLinksComponentData {
  github?: string;
  linkedin?: string;
  x?: string;
  email?: string;
  custom_link?: {
    name: string;
    url: string;
  };
  website?: {
    name: string;
    url: string;
  }[];
}

export interface LinkListComponentData {
  items: {
    label: string; // <= 80 chars
    url: string;
  }[];
}

export interface ImageComponentData {
  url: string;
  alt: string; // <= 120 chars
  maxImageSizeMB?: number; // default 2
}

export interface BioComponentData {
  headline: string; // <= 120 chars
  about: string; // <= 2000 chars
}

export interface PersonalInfoComponentData {
  full_name: string; // <= 100 chars
  position?: string; // <= 100 chars
}

export interface AvatarComponentData {
  avatar_url: string; // URL to avatar image
}

export interface OrderedListComponentData {
  items: {
    label: string; // <= 80 chars
    value?: string;
  }[];
}

// Union type for component data based on component type
export type ComponentData =
  | TextComponentData
  | ProjectCardComponentData
  | TechListComponentData
  | SocialLinksComponentData
  | LinkListComponentData
  | ImageComponentData
  | BioComponentData
  | OrderedListComponentData
  | PersonalInfoComponentData
  | AvatarComponentData;

// ============================================================================
// JSONB Portfolio Structure (used in draft_data and published_data)
// ============================================================================

export interface Component {
  id: string;
  type: ComponentType;
  data: ComponentData;
  visible?: boolean; // Optional for backward compatibility, defaults to true
}

export interface Section {
  id: string;
  title: string;
  slug: string;
  description: string;
  visible: boolean;
  components: Component[];
}

export interface BioData {
  full_name: string;
  position?: string;
  summary: string;
  avatar_url: string;
  social_links: SocialLinksComponentData;
}

export interface PortfolioData {
  bio: BioData;
  sections: Section[];
}

/**
 * Interface for AI-generated portfolio response (partial data)
 * Contains only the fields that AI generates, excluding user-configurable fields
 */
export interface AIPortfolioResponse {
  bio: {
    full_name: string;
    position: string;
    summary: string;
  };
  sections: {
    id: string;
    title: string;
    slug: string;
    description: string;
    visible: boolean;
    components: Component[];
  }[];
}

// ============================================================================
// Response DTOs
// ============================================================================

// Auth endpoints
export interface AuthSessionDto {
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

export interface UsernameAvailabilityDto {
  available: boolean;
}

export type UserProfileDto = Pick<Tables<"user_profiles">, "id" | "username">;

// Portfolio endpoints
export interface PortfolioDto {
  id: string;
  user_id: string;
  draft_data: PortfolioData;
  published_data: PortfolioData | null;
  created_at: string;
  updated_at: string;
  last_published_at: string | null;
}

export interface PublishStatusDto {
  id: string;
  published_data: PortfolioData;
  last_published_at: string;
}

// Import endpoints - GitHub
export interface GitHubRepoDto {
  id: number;
  name: string;
  full_name: string;
  stargazers_count: number;
  html_url: string;
}

export interface GenerateProjectCardsResultDto {
  components: Component[];
}

// Import endpoints - LinkedIn
export interface LinkedInDataInput {
  name: string;
  headline: string;
  about?: string;
  experience: {
    title: string;
    company: string;
    start_date?: string;
    end_date?: string | null;
    description?: string;
  }[];
  education?: {
    school: string;
    degree?: string;
    field?: string;
    start_date?: string;
    end_date?: string;
  }[];
  skills?: string[];
}

export interface LinkedInGenerateResultDto {
  sections: Section[];
}

// Public endpoints
export interface PublicPortfolioDto {
  username: string;
  published_data: PortfolioData;
  last_published_at: string;
}

// Preview endpoints
export interface PreviewPortfolioDto {
  username: string;
  draft_data: PortfolioData;
  updated_at: string;
}

// Error intake
export interface ErrorIntakeResponseDto {
  accepted: boolean;
}

// System endpoints
export interface HealthDto {
  status: string;
  time: string;
}

export interface VersionDto {
  version: string;
  commit: string;
}

// ============================================================================
// Command Models (Request DTOs)
// ============================================================================

// Auth commands
export interface ClaimUsernameCommand {
  username: string; // regex: ^[a-z0-9-]{3,30}$
}

// Portfolio commands
export interface CreatePortfolioCommand {
  draft_data?: PortfolioData;
}

export interface UpdatePortfolioCommand {
  draft_data: Partial<PortfolioData>;
}

// Import commands - GitHub
export interface GenerateProjectCardsCommand {
  repo_urls: string[];
  limit?: number; // default 10
}

// Import commands - LinkedIn
export interface LinkedInGenerateCommand extends LinkedInDataInput {}

// Error intake command
export interface ErrorIntakeCommand {
  severity: "debug" | "info" | "warn" | "error" | "fatal";
  source: "frontend" | "api" | "edge" | "worker" | "db" | "other";
  message: string;
  error_code?: string;
  route?: string;
  endpoint?: string;
  request_id?: string;
  session_id?: string;
  stack?: string;
  context?: Record<string, unknown>;
  portfolio_id?: string;
}

// ============================================================================
// API Response Envelope Types
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Pagination and Filtering Types
// ============================================================================

export interface PaginationQuery {
  page?: number; // default 1
  per_page?: number; // default 20, max 100
}

export interface SortingQuery {
  sort?: string;
  order?: "asc" | "desc";
}

export interface ComponentListQuery extends PaginationQuery, SortingQuery {
  type?: ComponentType;
  q?: string; // search within data
}

export interface SectionListQuery extends PaginationQuery, SortingQuery {}

// ============================================================================
// Utility Types for Type Guards and Validation
// ============================================================================

// Type guard for component data based on type
export interface ComponentDataMap {
  text: TextComponentData;
  cards: ProjectCardComponentData;
  pills: TechListComponentData;
  social_links: SocialLinksComponentData;
  list: LinkListComponentData | OrderedListComponentData;
  image: ImageComponentData;
  bio: BioComponentData;
  personal_info: PersonalInfoComponentData;
  avatar: AvatarComponentData;
}

// Extract component data type by component type
export type ComponentDataByType<T extends ComponentType> = ComponentDataMap[T];

export type QueryState = "idle" | "loading" | "success" | "error";

export interface User {
  user_id: string;
  profile_id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_onboarded: boolean;
}
