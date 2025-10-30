import { z } from "zod";

/**
 * Schema for validating LinkedIn profile URLs
 */
export const linkedinProfileUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => {
    try {
      const parsedUrl = new URL(url);
      // Must be linkedin.com
      if (parsedUrl.hostname !== "www.linkedin.com" && parsedUrl.hostname !== "linkedin.com") {
        return false;
      }
      // Must be a profile path (e.g., /in/username)
      const profilePathRegex = /^\/in\/[a-zA-Z0-9_-]+\/?$/;
      return profilePathRegex.test(parsedUrl.pathname);
    } catch {
      return false;
    }
  }, "Must be a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)");

/**
 * Schema for validating LinkedIn parse command
 */
export const linkedinParseCommandSchema = z
  .object({
    url: linkedinProfileUrlSchema,
    create_components: z.boolean().optional().default(false),
    section_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // If create_components is true, section_id is required
      if (data.create_components && !data.section_id) {
        return false;
      }
      return true;
    },
    {
      message: "section_id is required when create_components is true",
      path: ["section_id"],
    }
  );

/**
 * Schema for validating LinkedIn profile data structure
 */
export const linkedinProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headline: z.string().max(120, "Headline must be 120 characters or less"),
  experience: z
    .array(
      z.object({
        title: z.string().min(1, "Job title is required"),
        company: z.string().min(1, "Company name is required"),
      })
    )
    .max(5, "Maximum 5 experiences allowed"),
});

/**
 * Schema for validating LinkedIn parse result DTO
 */
export const linkedinParseResultDtoSchema = z.object({
  profile: linkedinProfileSchema,
  created_components: z.array(z.object({}).passthrough()), // Allow any component structure
});

export const linkedinAuthCommandSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100, "Full name must be 100 characters or less"),
  headline: z.string().max(120, "Headline must be 120 characters or less"),
  aboutMe: z.string().max(2000, "About me must be 2000 characters or less"),
  experience: z.string().max(3000, "Experience must be 3000 characters or less"),
});

// Export inferred types
export type LinkedInProfileUrl = z.infer<typeof linkedinProfileUrlSchema>;
export type LinkedInParseCommand = z.infer<typeof linkedinParseCommandSchema>;
export type LinkedInProfile = z.infer<typeof linkedinProfileSchema>;
export type LinkedInParseResultDto = z.infer<typeof linkedinParseResultDtoSchema>;
