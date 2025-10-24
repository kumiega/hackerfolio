/**
 * Component related data access functions
 */

import { repositories } from "@/lib/repositories";
import { AppError } from "@/lib/error-handler";
import type { ComponentDisplay } from "./types";

/**
 * Get components for a section with basic info
 *
 * @param sectionId - Section ID
 * @returns Promise<ComponentDisplay[]> - Array of components
 */
export async function getSectionComponents(sectionId: string): Promise<ComponentDisplay[]> {
  try {
    const components = await repositories.components.findBySectionId(sectionId);
    return components.map((component) => ({
      id: component.id,
      type: component.type,
      position: component.position,
      data: component.data as Record<string, unknown> | null,
      created_at: component.created_at,
    }));
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_ERROR") {
      return [];
    }
    throw error;
  }
}
