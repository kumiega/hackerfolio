import type { PortfolioData, AIPortfolioResponse } from "@/types";
import { aiPortfolioResponseSchema } from "@/lib/schemas/ai.schemas";
import { AppError } from "@/lib/error-handler";
import { PORTFOLIO_GENERATION_PROMPT_TEMPERATURE, TOKENS_LIMIT } from "../const";
import { replacePlaceholders, sanitizeInput } from "../prompt";
import { readFileSync } from "fs";
import { join } from "path";

// Read the portfolio generation prompt
const portfolioGenerationPrompt = readFileSync(join(process.cwd(), "src/lib/prompts/portfolio-generation.md"), "utf-8");

/**
 * OpenRouter AI Service
 *
 * Handles AI-powered content generation via OpenRouter API,
 * with support for structured JSON schema responses.
 * Used for portfolio generation, content parsing, and other AI tasks.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OpenRouterService {
  /**
   * OpenRouter API base URL
   */
  private static readonly OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

  /**
   * Default AI model for LinkedIn profile parsing
   */
  private static readonly DEFAULT_MODEL = "openai/gpt-oss-20b:free";

  /**
   * Timeout for AI API calls (30 seconds)
   */
  private static readonly AI_TIMEOUT_MS = 30000;

  /**
   * Calls OpenRouter API with the given prompt
   *
   * @param prompt - AI prompt to send
   * @param options - Additional options to pass to the OpenRouter API
   * @returns Promise<string> - Raw AI response
   */
  private static async callOpenRouterAPI(prompt: string, options: Record<string, unknown> = {}): Promise<string> {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AppError("INTERNAL_ERROR", "AI service configuration missing");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.AI_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.OPENROUTER_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://coderpage.com",
          "X-Title": "CoderPage Profile Generation",
        },
        body: JSON.stringify({
          model: this.DEFAULT_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: TOKENS_LIMIT,
          temperature: PORTFOLIO_GENERATION_PROMPT_TEMPERATURE,
          ...options,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("AI service rate limit exceeded");
        }
        if (response.status === 503 || response.status === 502) {
          throw new Error("AI service unavailable");
        }
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI service timeout");
      }

      throw error;
    }
  }

  /**
   * Parses and validates AI response into AIPortfolioResponse structure
   *
   * @param aiResponse - Raw AI response string (may be wrapped in markdown)
   * @returns AIPortfolioResponse object
   */
  private static parseAIResponse(aiResponse: string): AIPortfolioResponse {
    let jsonString = aiResponse.trim();

    // Handle markdown-wrapped JSON responses (```json ... ```)
    if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
      // Extract content between ```json and ```
      const startIndex = jsonString.indexOf("\n") + 1;
      const endIndex = jsonString.lastIndexOf("\n");
      jsonString = jsonString.slice(startIndex, endIndex).trim();
    } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
      // Handle generic markdown code blocks
      const startIndex = jsonString.indexOf("\n") + 1;
      const endIndex = jsonString.lastIndexOf("\n");
      jsonString = jsonString.slice(startIndex, endIndex).trim();
    }

    const aiPortfolioResponse = JSON.parse(jsonString) as AIPortfolioResponse;
    return aiPortfolioResponse;
  }

  /**
   * Converts AI response to full PortfolioData format
   *
   * @param aiResponse - AI-generated partial portfolio data
   * @returns PortfolioData - Complete portfolio data with default values
   */
  private static transformAIResponseToPortfolioData(aiResponse: AIPortfolioResponse): PortfolioData {
    console.log("Transforming AI response to PortfolioData...");
    console.log("AI response bio:", aiResponse.bio);
    console.log("AI response sections count:", aiResponse.sections.length);

    const portfolioData = {
      bio: {
        full_name: aiResponse.bio.full_name,
        position: aiResponse.bio.position,
        summary: aiResponse.bio.summary,
        avatar_url: "", // Will be filled later by user
        social_links: {
          github: undefined,
          linkedin: undefined,
          x: undefined,
          email: undefined,
          custom_link: undefined,
          website: undefined,
        },
      },
      sections: aiResponse.sections,
    };

    console.log("Transformation completed successfully");
    return portfolioData;
  }

  /**
   * Generates portfolio data using AI with structured JSON schema
   *
   * @param prompt - The AI prompt to send
   * @param schema - JSON schema for structured response (optional, defaults to AI response schema)
   * @returns Promise<PortfolioData> - Generated portfolio structure
   */
  static async generatePortfolioWithSchema(prompt: string, schema?: Record<string, unknown>): Promise<PortfolioData> {
    // Prepare API options with schema if provided
    const options: Record<string, unknown> = {};

    // Use AI response schema if no schema provided
    const responseSchema = schema || aiPortfolioResponseSchema;

    // options.response_format = {
    //   type: "json_schema",
    //   json_schema: {
    //     name: "portfolio",
    //     schema: responseSchema,
    //     strict: true,
    //   },
    // };

    // Call OpenRouter API
    const aiResponse = await this.callOpenRouterAPI(prompt, options);
    console.log("aiResponse", aiResponse);

    // Parse and validate the response
    try {
      const aiPortfolioResponse = this.parseAIResponse(aiResponse);

      // Basic validation to ensure required fields exist
      if (!aiPortfolioResponse.bio || !aiPortfolioResponse.sections) {
        throw new Error("Invalid portfolio structure generated by AI");
      }

      // Transform to full PortfolioData format
      return this.transformAIResponseToPortfolioData(aiPortfolioResponse);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("AI returned invalid JSON response");
      }
      throw error;
    }
  }

  /**
   * Generates portfolio data from LinkedIn form input using AI with structured schema
   *
   * @param formData - Sanitized form data from LinkedIn form
   * @returns Promise<PortfolioData> - Generated portfolio structure
   */
  static async generatePortfolioFromLinkedIn(formData: {
    fullName: string;
    position: string;
    summary: string;
    experience: string;
  }): Promise<PortfolioData> {
    console.log("Sanitizing LinkedIn form data...");
    // Sanitize all input data to prevent prompt injection
    const sanitizedData = {
      full_name: sanitizeInput(formData.fullName),
      position: sanitizeInput(formData.position),
      summary: sanitizeInput(formData.summary),
      experience: sanitizeInput(formData.experience),
    };
    console.log("Sanitized data keys:", Object.keys(sanitizedData));

    console.log("Generating prompt...");
    // Replace placeholders in the prompt
    const prompt = replacePlaceholders(portfolioGenerationPrompt, sanitizedData);
    console.log("Prompt length:", prompt.length);

    console.log("Calling generatePortfolioWithSchema...");
    // Generate portfolio using AI response schema (will be transformed to full PortfolioData)
    const result = await this.generatePortfolioWithSchema(prompt);
    console.log("LinkedIn portfolio generation completed");
    return result;
  }
}
