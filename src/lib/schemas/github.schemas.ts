import { z } from "zod";

/**
 * Schema for validating repository visibility parameter
 */
export const repositoryVisibilitySchema = z.enum(["all", "public", "private"]);

/**
 * Schema for validating GitHub repositories query parameters
 *
 * Used for GET /api/v1/imports/github/repos endpoint
 */
export const githubReposQuerySchema = z.object({
  visibility: repositoryVisibilitySchema.default("all"),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(30),
});

/**
 * Schema for validating GitHub access token (should be present in request context)
 */
export const githubAccessTokenSchema = z.string().min(1, "GitHub access token is required");

/**
 * Export inferred types
 */
export type GitHubReposQuery = z.infer<typeof githubReposQuerySchema>;
export type RepositoryVisibility = z.infer<typeof repositoryVisibilitySchema>;
export type GitHubAccessToken = z.infer<typeof githubAccessTokenSchema>;
