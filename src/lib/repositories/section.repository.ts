import type { Database } from "@/db/database.types";
import { BaseRepository } from "./base.repository";

type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type SectionInsert = Database["public"]["Tables"]["sections"]["Insert"];
type SectionUpdate = Database["public"]["Tables"]["sections"]["Update"];

/**
 * Repository for section data access operations
 *
 * Handles all database operations related to portfolio sections including:
 * - Section CRUD operations
 * - Position management (ordering)
 * - Portfolio section retrieval
 */
export class SectionRepository extends BaseRepository {
  private readonly tableName = "sections";

  /**
   * Find a section by ID
   *
   * @param sectionId - Section ID to search for
   * @returns Promise<SectionRow | null> - Section or null if not found
   */
  async findById(sectionId: string): Promise<SectionRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").eq("id", sectionId).single(),
      "Failed to find section",
      { sectionId }
    );
  }

  /**
   * Find all sections for a portfolio
   *
   * @param portfolioId - Portfolio ID to get sections for
   * @returns Promise<SectionRow[]> - Array of sections ordered by position
   */
  async findByPortfolioId(portfolioId: string): Promise<SectionRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("portfolio_id", portfolioId)
          .order("position", { ascending: true }),
      "Failed to find sections by portfolio ID",
      { portfolioId }
    );
  }

  /**
   * Create a new section
   *
   * @param section - Section data to insert
   * @returns Promise<SectionRow> - Created section
   */
  async create(section: SectionInsert): Promise<SectionRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).insert(section).select("*").single(),
      "Failed to create section",
      { section }
    );
  }

  /**
   * Update an existing section
   *
   * @param sectionId - Section ID to update
   * @param updates - Fields to update
   * @returns Promise<SectionRow> - Updated section
   */
  async update(sectionId: string, updates: SectionUpdate): Promise<SectionRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).update(updates).eq("id", sectionId).select("*").single(),
      "Failed to update section",
      { sectionId, updates }
    );
  }

  /**
   * Delete a section by ID
   *
   * @param sectionId - Section ID to delete
   * @returns Promise<void>
   */
  async delete(sectionId: string): Promise<void> {
    await this.executeQuery(
      async () => await this.supabase.from(this.tableName).delete().eq("id", sectionId),
      "Failed to delete section",
      { sectionId }
    );
  }

  /**
   * Check if a section exists by ID
   *
   * @param sectionId - Section ID to check
   * @returns Promise<boolean> - True if section exists
   */
  async exists(sectionId: string): Promise<boolean> {
    const result = await this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("id").eq("id", sectionId).single(),
      "Failed to check section existence",
      { sectionId }
    );

    return result !== null;
  }

  /**
   * Get the next position for a new section in a portfolio
   *
   * @param portfolioId - Portfolio ID to get next position for
   * @returns Promise<number> - Next position number (starting from 1)
   */
  async getNextPosition(portfolioId: string): Promise<number> {
    const result = await this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("position")
          .eq("portfolio_id", portfolioId)
          .order("position", { ascending: false })
          .limit(1),
      "Failed to get next position",
      { portfolioId }
    );

    return result.length > 0 ? result[0].position + 1 : 1;
  }

  /**
   * Reorder sections within a portfolio
   *
   * @param portfolioId - Portfolio ID containing the sections
   * @param sectionUpdates - Array of {id, position} updates
   * @returns Promise<void>
   */
  async reorderSections(portfolioId: string, sectionUpdates: { id: string; position: number }[]): Promise<void> {
    // Execute all position updates in a batch
    const updates = sectionUpdates.map(
      ({ id, position }) =>
        this.supabase.from(this.tableName).update({ position }).eq("id", id).eq("portfolio_id", portfolioId) // Extra safety check
    );

    // Execute all updates
    const results = await Promise.all(updates);

    // Check if any updates failed
    const failedUpdates = results.filter((result) => result.error);
    if (failedUpdates.length > 0) {
      throw new Error(`Failed to reorder sections: ${failedUpdates.map((r) => r.error?.message).join(", ")}`);
    }
  }

  /**
   * Move a section to a new position and adjust other sections accordingly
   *
   * @param sectionId - Section ID to move
   * @param newPosition - New position for the section
   * @returns Promise<void>
   */
  async moveSection(sectionId: string, newPosition: number): Promise<void> {
    // First, get the section to find its portfolio
    const section = await this.findById(sectionId);
    if (!section) {
      throw new Error(`Section ${sectionId} not found`);
    }

    const portfolioId = section.portfolio_id;
    const currentPosition = section.position;

    if (currentPosition === newPosition) {
      return; // No change needed
    }

    // Get all sections for the portfolio to understand the current ordering
    const allSections = await this.findByPortfolioId(portfolioId);

    if (newPosition < currentPosition) {
      // Moving up: shift sections between newPosition and currentPosition down by 1
      const sectionsToShift = allSections.filter(
        (s) => s.position >= newPosition && s.position < currentPosition && s.id !== sectionId
      );

      await this.reorderSections(portfolioId, [
        { id: sectionId, position: newPosition },
        ...sectionsToShift.map((s) => ({ id: s.id, position: s.position + 1 })),
      ]);
    } else {
      // Moving down: shift sections between currentPosition and newPosition up by 1
      const sectionsToShift = allSections.filter(
        (s) => s.position > currentPosition && s.position <= newPosition && s.id !== sectionId
      );

      await this.reorderSections(portfolioId, [
        { id: sectionId, position: newPosition },
        ...sectionsToShift.map((s) => ({ id: s.id, position: s.position - 1 })),
      ]);
    }
  }

  /**
   * Find sections by portfolio ID with component counts
   *
   * @param portfolioId - Portfolio ID to get sections for
   * @returns Promise<Array<SectionRow & { component_count: number }>> - Sections with component counts
   */
  async findByPortfolioIdWithComponentCounts(
    portfolioId: string
  ): Promise<(SectionRow & { component_count: number })[]> {
    const result = await this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select(
            `
          *,
          components:components(count)
        `
          )
          .eq("portfolio_id", portfolioId)
          .order("position", { ascending: true }),
      "Failed to find sections with component counts",
      { portfolioId }
    );

    return result.map((section) => ({
      ...section,
      component_count: Array.isArray(section.components) ? section.components.length : 0,
    }));
  }
}
