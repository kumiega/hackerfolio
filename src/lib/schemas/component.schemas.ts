import { z } from "zod";
import type { ComponentType, ComponentData } from "@/types";

/**
 * Schema for validating component ID parameter (UUID format)
 */
export const componentIdSchema = z.string().uuid();

/**
 * Schema for validating text component data
 */
export const textComponentDataSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content must be 2000 characters or less"),
});

/**
 * Schema for validating individual project card data
 */
export const projectCardDataSchema = z.object({
  repo_url: z.string(),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  summary: z.string().max(500, "Summary must be 500 characters or less"),
  tech: z.array(z.string()).optional().default([]),
});

/**
 * Schema for validating project card component data (array of cards)
 */
export const projectCardComponentDataSchema = z.object({
  cards: z.array(projectCardDataSchema).min(1, "At least one card is required").max(10, "Maximum 10 cards allowed"),
});

/**
 * Schema for validating tech list component data
 */
export const techListComponentDataSchema = z.object({
  items: z.array(z.string().max(20, "Each item must be 20 characters or less")).max(30, "Maximum 30 items allowed"),
});

/**
 * Schema for validating social links component data
 */
export const socialLinksComponentDataSchema = z.object({
  github: z
    .string()
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid GitHub URL",
    })
    .optional(),
  linkedin: z
    .string()
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid LinkedIn URL",
    })
    .optional(),
  x: z
    .string()
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid X/Twitter URL",
    })
    .optional(),
  website: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url("Invalid URL"),
      })
    )
    .optional()
    .default([]),
});

/**
 * Schema for validating link list component data
 */
export const linkListComponentDataSchema = z.object({
  items: z.array(
    z.object({
      label: z.string().min(1, "Label is required").max(80, "Label must be 80 characters or less"),
      url: z.string().url("Invalid URL"),
    })
  ),
});

/**
 * Schema for validating image component data
 */
export const imageComponentDataSchema = z.object({
  url: z.string().url("Image URL is required and must be a valid URL").min(1, "Image URL is required"),
  alt: z.string().max(120, "Alt text must be 120 characters or less"),
  maxImageSizeMB: z.number().positive().optional(),
});

/**
 * Schema for validating bio component data
 */
export const bioComponentDataSchema = z.object({
  headline: z.string().min(1, "Headline is required").max(120, "Headline must be 120 characters or less"),
  about: z.string().max(2000, "About text must be 2000 characters or less"),
});

export const personalInfoComponentDataSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  position: z.string().max(100, "Position must be 100 characters or less").optional(),
});

export const avatarComponentDataSchema = z.object({
  avatar_url: z.string().url("Avatar URL must be a valid URL"),
});

/**
 * Schema for validating ordered list component data
 */
export const orderedListComponentDataSchema = z.object({
  items: z.array(
    z.object({
      label: z.string().max(80, "Label must be 80 characters or less"),
      value: z.string().optional(),
    })
  ),
});

/**
 * Schema for validating section ID parameter (UUID format)
 */
export const sectionIdSchema = z.string().uuid();

/**
 * Schema for validating reorder command (position)
 */
export const reorderCommandSchema = z.object({
  position: z.number().int().min(0),
});

/**
 * Schema for validating component creation command
 */
export const createComponentCommandSchema = z.object({
  type: z.enum(["text", "cards", "pills", "social_links", "list", "image", "bio", "personal_info", "avatar"]),
  data: z.union([
    textComponentDataSchema,
    projectCardComponentDataSchema,
    techListComponentDataSchema,
    socialLinksComponentDataSchema,
    linkListComponentDataSchema,
    imageComponentDataSchema,
    bioComponentDataSchema,
    orderedListComponentDataSchema,
    personalInfoComponentDataSchema,
    avatarComponentDataSchema,
  ]),
});

/**
 * Schema for validating component update command
 */
export const updateComponentCommandSchema = z.object({
  data: z.object({}).passthrough(), // Allow any object structure for data, validated at runtime
});

/**
 * Schema for validating component list query parameters
 */
export const componentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["position", "created_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
  type: z
    .enum(["text", "cards", "pills", "social_links", "list", "image", "bio", "personal_info", "avatar"])
    .optional(),
  q: z.string().optional(),
});

// Export types inferred from schemas
export type ComponentId = z.infer<typeof componentIdSchema>;
export type SectionId = z.infer<typeof sectionIdSchema>;
export type ReorderCommand = z.infer<typeof reorderCommandSchema>;
export type CreateComponentCommand = z.infer<typeof createComponentCommandSchema>;
export type UpdateComponentCommand = z.infer<typeof updateComponentCommandSchema>;
/**
 * Schema for validating GitHub repository URLs
 */
export const githubRepoUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === "github.com" && new RegExp("^/[^/]+/[^/]+/?$").test(parsedUrl.pathname);
    } catch {
      return false;
    }
  }, "URL must be a valid GitHub repository URL (e.g., https://github.com/user/repo)");

/**
 * Schema for validating generate project cards command
 */
export const generateProjectCardsCommandSchema = z.object({
  section_id: sectionIdSchema,
  repo_urls: z
    .array(githubRepoUrlSchema)
    .min(1, "At least one repository URL is required")
    .max(10, "Maximum 10 repository URLs allowed"),
  limit: z.number().int().min(1).max(10).optional().default(10),
});

export type ComponentListQuery = z.infer<typeof componentListQuerySchema>;
export type GenerateProjectCardsCommand = z.infer<typeof generateProjectCardsCommandSchema>;

// Schema map for component types - using z.ZodTypeAny to allow type flexibility
const componentDataSchemas: Record<ComponentType, z.ZodTypeAny> = {
  text: textComponentDataSchema,
  cards: projectCardComponentDataSchema,
  pills: techListComponentDataSchema,
  social_links: socialLinksComponentDataSchema,
  list: linkListComponentDataSchema,
  image: imageComponentDataSchema,
  bio: bioComponentDataSchema,
  personal_info: personalInfoComponentDataSchema,
  avatar: avatarComponentDataSchema,
};

/**
 * Validates component data using Zod schemas
 * @param type - The component type
 * @param data - The component data to validate
 * @returns null if valid, error message string if invalid
 */
export function validateComponentData(type: ComponentType, data: ComponentData): string | null {
  const schema = componentDataSchemas[type];
  if (!schema) {
    return `Unknown component type: ${type}`;
  }

  try {
    schema.parse(data);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the first error message
      return error.issues[0]?.message || "Validation failed";
    }
    return "Validation failed";
  }
}

/**
 * Validates component data using Zod schemas (returns full ZodError for detailed errors)
 * @param type - The component type
 * @param data - The component data to validate
 * @returns SafeParseResult with success/error details
 */
export function safeValidateComponentData(type: ComponentType, data: ComponentData) {
  const schema = componentDataSchemas[type];
  if (!schema) {
    return {
      success: false as const,
      error: {
        issues: [
          {
            code: "custom" as const,
            message: `Unknown component type: ${type}`,
          },
        ],
      },
    };
  }

  return schema.safeParse(data);
}
