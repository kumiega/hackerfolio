import type { APIRoute } from "astro";
import type { LinkedInGenerateResultDto, LinkedInGenerateCommand } from "@/types";
import { z } from "zod";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { randomUUID } from "crypto";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for LinkedIn data input validation
 */
const linkedInGenerateSchema = z.object({
  name: z.string().min(1).max(200),
  headline: z.string().min(1).max(300),
  about: z.string().optional(),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        start_date: z.string().optional(),
        end_date: z.string().nullable().optional(),
        description: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().optional(),
        field: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  skills: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/v1/imports/linkedin/generate
 *
 * Generates portfolio structure (sections and components) from manually entered LinkedIn data.
 * Uses AI to intelligently organize the data into a portfolio structure that the client
 * can merge into their draft_data.
 *
 * The endpoint requires user authentication and does NOT save data to the database.
 * It returns generated sections with components for the client to add to their portfolio.
 *
 * @param body - LinkedIn data input (name, headline, about, experience, education, skills)
 * @returns 200 - Generated sections with components
 * @returns 401 - User not authenticated
 * @returns 422 - Invalid input data or validation errors
 * @returns 429 - AI model rate limit exceeded
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();

  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    // Step 2: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_JSON", requestId);
    }

    // Step 3: Validate request data using Zod schema
    const validation = linkedInGenerateSchema.safeParse(requestBody);
    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request data", {
        issues: validation.error.issues,
      });
    }

    const command: LinkedInGenerateCommand = validation.data;

    // Step 4: Generate portfolio structure from LinkedIn data
    // For MVP, we'll create a simple structure without AI
    // In production, this would call OpenRouter AI to intelligently organize the data
    const sections = [];

    // Create "About" section with bio component
    if (command.name || command.headline || command.about) {
      sections.push({
        id: randomUUID(),
        title: "About",
        slug: "about",
        description: "Introduction and professional summary",
        visible: true,
        components: [
          {
            id: randomUUID(),
            type: "bio" as const,
            data: {
              headline: command.headline || command.name,
              about: command.about || "",
            },
          },
        ],
      });
    }

    // Create "Experience" section with list components
    if (command.experience && command.experience.length > 0) {
      sections.push({
        id: randomUUID(),
        title: "Experience",
        slug: "experience",
        description: "Professional work experience",
        visible: true,
        components: [
          {
            id: randomUUID(),
            type: "list" as const,
            data: {
              items: command.experience.map((exp) => ({
                label: `${exp.title} at ${exp.company}`,
                url: "",
              })),
            },
          },
        ],
      });
    }

    // Create "Education" section with list components
    if (command.education && command.education.length > 0) {
      sections.push({
        id: randomUUID(),
        title: "Education",
        slug: "education",
        description: "Educational background",
        visible: true,
        components: [
          {
            id: randomUUID(),
            type: "list" as const,
            data: {
              items: command.education.map((edu) => ({
                label: `${edu.degree || "Degree"} at ${edu.school}`,
                url: "",
              })),
            },
          },
        ],
      });
    }

    // Create "Skills" section with pills component
    if (command.skills && command.skills.length > 0) {
      sections.push({
        id: randomUUID(),
        title: "Skills",
        slug: "skills",
        description: "Technical and professional skills",
        visible: true,
        components: [
          {
            id: randomUUID(),
            type: "pills" as const,
            data: {
              items: command.skills.slice(0, 30), // Limit to 30 skills
            },
          },
        ],
      });
    }

    // Step 5: Return success response with generated sections
    const response: LinkedInGenerateResultDto = {
      sections,
    };

    return new Response(JSON.stringify({ data: response }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/imports/linkedin/generate",
      route: request.url,
      userId: locals.user?.user_id,
    });
  }
};
