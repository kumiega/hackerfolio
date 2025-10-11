import { z } from "zod";

/**
 * Schema for validating component ID parameter (UUID format)
 */
export const componentIdSchema = z.string().uuid();

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
  type: z.enum([
    "text",
    "project_card",
    "tech_list",
    "social_links",
    "link_list",
    "gallery",
    "bio",
    "ordered_list"
  ]),
  data: z.object({}).passthrough(), // Allow any object structure for data, validated at runtime
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
  type: z.enum([
    "text",
    "project_card",
    "tech_list",
    "social_links",
    "link_list",
    "gallery",
    "bio",
    "ordered_list"
  ]).optional(),
  q: z.string().optional(),
});

// Export types inferred from schemas
export type ComponentId = z.infer<typeof componentIdSchema>;
export type SectionId = z.infer<typeof sectionIdSchema>;
export type ReorderCommand = z.infer<typeof reorderCommandSchema>;
export type CreateComponentCommand = z.infer<typeof createComponentCommandSchema>;
export type UpdateComponentCommand = z.infer<typeof updateComponentCommandSchema>;
export type ComponentListQuery = z.infer<typeof componentListQuerySchema>;
