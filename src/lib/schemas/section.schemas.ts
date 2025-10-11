import { z } from "zod";

/**
 * Schema for validating section list query parameters
 */
export const sectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["position", "name", "created_at"]).optional().default("position"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

/**
 * Schema for validating portfolio ID parameter (UUID format)
 */
export const portfolioIdSchema = z.string().uuid();

/**
 * Schema for validating section creation command
 */
export const createSectionCommandSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  visible: z.boolean().optional().default(true),
});

/**
 * Schema for validating section update command
 */
export const updateSectionCommandSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  visible: z.boolean().optional(),
});

/**
 * Schema for validating reorder command (position)
 */
export const reorderCommandSchema = z.object({
  position: z.number().int().min(0),
});

/**
 * Schema for validating section ID parameter (UUID format)
 */
export const sectionIdSchema = z.string().uuid();

// Export types inferred from schemas
export type SectionListQuery = z.infer<typeof sectionListQuerySchema>;
export type CreateSectionCommand = z.infer<typeof createSectionCommandSchema>;
export type UpdateSectionCommand = z.infer<typeof updateSectionCommandSchema>;
export type ReorderCommand = z.infer<typeof reorderCommandSchema>;
