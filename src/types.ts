// Shared types for backend and frontend (Entities, DTOs)
import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Enums (mirroring database enums)
// ============================================================================

export type ComponentType = Enums<"component_type">;

// ============================================================================
// Component Data Types (type-specific data structures)
// ============================================================================

export interface TextComponentData {
  content: string; // <= 2000 chars
}

export interface ProjectCardComponentData {
  repo_url: string;
  title: string; // <= 100 chars
  summary: string; // <= 500 chars
  tech: string[];
}

export interface TechListComponentData {
  items: string[]; // <= 30 items, each <= 20 chars
}

export interface SocialLinksComponentData {
  github?: string;
  linkedin?: string;
  x?: string;
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
  | OrderedListComponentData;

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
export type PortfolioDto = Pick<
  Tables<"portfolios">,
  "id" | "user_id" | "is_published" | "published_at" | "title" | "description" | "created_at"
>;

export interface PublishStatusDto {
  is_published: boolean;
  published_at: string | null;
}

// Section endpoints
export type SectionDto = Omit<Tables<"sections">, "portfolio_id" | "created_at" | "updated_at">;

// Component endpoints
export type ComponentDto = Omit<Tables<"components">, "section_id" | "created_at" | "updated_at">;

// Import endpoints - GitHub
export interface GitHubRepoDto {
  id: number;
  name: string;
  full_name: string;
  stargazers_count: number;
  html_url: string;
}

export interface GenerateProjectCardsResultDto {
  created: number;
  components: ComponentDto[];
}

// Import endpoints - LinkedIn
export interface LinkedInProfile {
  name: string;
  headline: string;
  experience: {
    title: string;
    company: string;
  }[];
}

export interface LinkedInParseResultDto {
  profile: LinkedInProfile;
  created_components: ComponentDto[];
}

// Public endpoints
export interface PublicSectionDto extends SectionDto {
  components: ComponentDto[];
}

export interface PublicPortfolioDto {
  username: string;
  portfolio: Pick<PortfolioDto, "title" | "description" | "published_at">;
  sections: PublicSectionDto[];
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
export type CreatePortfolioCommand = Pick<TablesInsert<"portfolios">, "title" | "description">;

export type UpdatePortfolioCommand = Partial<Pick<TablesUpdate<"portfolios">, "title" | "description">>;

// Section commands
export type CreateSectionCommand = Pick<TablesInsert<"sections">, "name" | "visible">;

export type UpdateSectionCommand = Partial<Pick<TablesUpdate<"sections">, "name" | "visible">>;

export interface ReorderCommand {
  position: number;
}

// Component commands
export interface CreateComponentCommand {
  type: ComponentType;
  data: ComponentData;
}

export interface UpdateComponentCommand {
  data: ComponentData;
}

// Import commands - GitHub
export interface GenerateProjectCardsCommand {
  section_id: string;
  repo_urls: string[];
  limit?: number; // default 10
}

// Import commands - LinkedIn
export interface LinkedInParseCommand {
  url: string;
  create_components?: boolean; // default false
  section_id?: string; // required if create_components is true
}

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
  card: ProjectCardComponentData;
  pills: TechListComponentData;
  social_links: SocialLinksComponentData;
  list: LinkListComponentData | OrderedListComponentData;
  image: ImageComponentData;
  bio: BioComponentData;
}

// Extract component data type by component type
export type ComponentDataByType<T extends ComponentType> = ComponentDataMap[T];

export type QueryState = "idle" | "loading" | "success" | "error";
