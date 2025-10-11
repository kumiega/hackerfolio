import { z } from "zod";

/**
 * Schema for validating component ID parameter (UUID format)
 */
export const componentIdSchema = z.string().uuid();

/**
 * Schema for validating text component data
 */
export const textComponentDataSchema = z.object({
  content: z.string().max(2000, "Content must be 2000 characters or less"),
});

/**
 * Schema for validating project card component data
 */
export const projectCardComponentDataSchema = z.object({
  repo_url: z.string().url("Repository URL must be a valid URL"),
  title: z.string().max(100, "Title must be 100 characters or less"),
  summary: z.string().max(500, "Summary must be 500 characters or less"),
  tech: z.array(z.string()).max(20, "Maximum 20 technologies allowed"),
});

/**
 * Schema for validating tech list component data
 */
export const techListComponentDataSchema = z.object({
  items: z
    .array(z.string().max(20, "Each tech item must be 20 characters or less"))
    .max(30, "Maximum 30 tech items allowed"),
});

/**
 * Schema for validating social links component data
 */
export const socialLinksComponentDataSchema = z.object({
  github: z.string().optional(),
  linkedin: z.string().optional(),
  x: z.string().optional(),
  website: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url("Website URL must be valid"),
      })
    )
    .optional(),
});

/**
 * Schema for validating link list component data
 */
export const linkListComponentDataSchema = z.object({
  items: z.array(
    z.object({
      label: z.string().max(80, "Label must be 80 characters or less"),
      url: z.string().url("URL must be valid"),
    })
  ),
});

/**
 * Schema for validating gallery component data
 */
export const galleryComponentDataSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().url("Image URL must be valid"),
      alt: z.string().max(120, "Alt text must be 120 characters or less"),
    })
  ),
  maxImageSizeMB: z.number().optional().default(2),
});

/**
 * Schema for validating bio component data
 */
export const bioComponentDataSchema = z.object({
  headline: z.string().max(120, "Headline must be 120 characters or less"),
  about: z.string().max(2000, "About text must be 2000 characters or less"),
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
  type: z.enum(["text", "project_card", "tech_list", "social_links", "list", "gallery", "bio"]),
  data: z.union([
    textComponentDataSchema,
    projectCardComponentDataSchema,
    techListComponentDataSchema,
    socialLinksComponentDataSchema,
    linkListComponentDataSchema,
    galleryComponentDataSchema,
    bioComponentDataSchema,
    orderedListComponentDataSchema,
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
  type: z.enum(["text", "project_card", "tech_list", "social_links", "list", "gallery", "bio"]).optional(),
  q: z.string().optional(),
});

// Export types inferred from schemas
export type ComponentId = z.infer<typeof componentIdSchema>;
export type SectionId = z.infer<typeof sectionIdSchema>;
export type ReorderCommand = z.infer<typeof reorderCommandSchema>;
export type CreateComponentCommand = z.infer<typeof createComponentCommandSchema>;
export type UpdateComponentCommand = z.infer<typeof updateComponentCommandSchema>;
export type ComponentListQuery = z.infer<typeof componentListQuerySchema>;
