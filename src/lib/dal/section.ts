/**
 * Section related data access functions
 */

import { repositories } from "@/lib/repositories";
import { AppError } from "@/lib/error-handler";
import type { SectionDisplay } from "./types";

/**
 * Get sections for a portfolio with basic info
 *
 * @param portfolioId - Portfolio ID
 * @returns Promise<SectionDisplay[]> - Array of sections
 */
export async function getPortfolioSections(portfolioId: string): Promise<SectionDisplay[]> {
  try {
    const sections = await repositories.sections.findByPortfolioId(portfolioId);
    return sections.map((section) => ({
      id: section.id,
      name: section.name,
      position: section.position,
      visible: section.visible,
      created_at: section.created_at,
    }));
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return [];
    }
    throw error;
  }
}
