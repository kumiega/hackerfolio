import type { APIRoute } from "astro";
import type { AuthSessionDto, LinkedInParseResultDto, ComponentDto } from "@/types";
import { AuthService } from "@/lib/services/auth.service";
import { LinkedInService } from "@/lib/services/linkedin.service";
import { ComponentService } from "@/lib/services/component.service";
import { handleApiError, createErrorResponse } from "@/lib/error-handler";
import { logError } from "@/lib/error-utils";
import { linkedinParseCommandSchema } from "@/lib/schemas/linkedin.schemas";
import { RateLimiter, RATE_LIMITS } from "@/lib/rate-limiter";

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST /api/v1/imports/linkedin/parse
 *
 * Parses LinkedIn profile URLs using AI to extract structured data. This endpoint
 * accepts a LinkedIn profile URL, processes it through an AI service (OpenRouter),
 * and returns structured profile information. Optionally, it can create portfolio
 * components directly in a specified section if the user chooses to do so.
 *
 * The endpoint requires user authentication and validates that the user owns the
 * target section when component creation is requested. It also enforces portfolio
 * component limits (maximum 15 components total per portfolio).
 *
 * @param body.url - Valid LinkedIn profile URL (e.g., "https://www.linkedin.com/in/username")
 * @param body.create_components - Whether to create portfolio components from parsed data (default: false)
 * @param body.section_id - Required when create_components=true - target section UUID for component creation
 * @returns 201 - Profile parsed successfully with parsed data and optional created components
 * @returns 400 - Invalid request body or LinkedIn URL format
 * @returns 401 - User not authenticated or section ownership violation
 * @returns 404 - Section not found
 * @returns 409 - Component limit exceeded (15 per portfolio)
 * @returns 422 - LinkedIn profile not accessible or AI parsing failed
 * @returns 429 - AI service rate limit exceeded
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async (context) => {
  const { locals, request } = context;
  const supabase = locals.supabase;
  const requestId = locals.requestId || crypto.randomUUID();
  let authenticatedUser: AuthSessionDto | null = null;

  try {
    // Step 1: Authentication check
    authenticatedUser = await AuthService.getCurrentSession(supabase);
    if (!authenticatedUser) {
      return createErrorResponse("UNAUTHENTICATED", requestId);
    }

    // Step 2: Rate limiting check
    try {
      await RateLimiter.enforceRateLimit(
        supabase,
        authenticatedUser.user.id,
        "linkedin_parse",
        RATE_LIMITS.LINKEDIN_PARSE
      );
    } catch (rateLimitError) {
      return createErrorResponse("VALIDATION_ERROR", requestId, (rateLimitError as Error).message);
    }

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse("INVALID_JSON", requestId);
    }

    // Step 4: Validate request data using Zod schema
    const validation = linkedinParseCommandSchema.safeParse(requestBody);
    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", requestId, "Invalid request data", {
        issues: validation.error.issues,
      });
    }

    const command = validation.data;

    // Step 5: Parse LinkedIn profile with AI
    const profile = await LinkedInService.parseProfileWithAI(
      supabase,
      command.url,
      authenticatedUser.user.id,
      requestId
    );

    // Step 6: Handle optional component creation
    let createdComponents: ComponentDto[] = [];

    if (command.create_components && command.section_id) {
      // Verify section ownership - use RLS policies to ensure user owns the section
      const { data: sectionData, error: sectionError } = await supabase
        .from("sections")
        .select("id, portfolio_id")
        .eq("id", command.section_id)
        .single();

      if (sectionError || !sectionData) {
        if (sectionError?.code === "PGRST116") {
          return createErrorResponse("SECTION_NOT_FOUND", requestId);
        }
        return createErrorResponse("DATABASE_ERROR", requestId);
      }

      // Create bio component from profile data
      try {
        const bioData = LinkedInService.convertProfileToBioComponent(profile);
        createdComponents = await ComponentService.createComponents(
          supabase,
          command.section_id,
          authenticatedUser.user.id,
          [{ type: "bio", data: bioData }]
        );
      } catch (componentError) {
        // Log component creation error but don't fail the entire request
        await logError(supabase, {
          message: "Failed to create bio component from LinkedIn profile",
          severity: "warn",
          source: "api",
          endpoint: "POST /api/v1/imports/linkedin/parse",
          route: request.url,
          request_id: requestId,
          context: {
            profile_name: profile.name,
            section_id: command.section_id,
            error: componentError instanceof Error ? componentError.message : String(componentError),
          },
          portfolio_id: sectionData.portfolio_id,
        });
        // Continue without created components
        createdComponents = [];
      }
    }

    // Step 7: Return success response
    const response: LinkedInParseResultDto = {
      profile,
      created_components: createdComponents,
    };

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      supabase,
      requestId,
      endpoint: "POST /api/v1/imports/linkedin/parse",
      route: request.url,
      userId: authenticatedUser?.user?.id,
    });
  }
};
