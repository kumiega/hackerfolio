import type { Database } from "@/db/database.types";
import type { ComponentType } from "@/types";
import { BaseRepository } from "./base.repository";

type ComponentRow = Database["public"]["Tables"]["components"]["Row"];
type ComponentInsert = Database["public"]["Tables"]["components"]["Insert"];
type ComponentUpdate = Database["public"]["Tables"]["components"]["Update"];

type ComponentWithSection = ComponentRow & {
  sections: {
    portfolio_id: string;
  };
};

type ComponentWithSectionInfo = ComponentRow & {
  sections: {
    name: string;
    visible: boolean;
    portfolio_id: string;
  };
};

/**
 * Repository for component data access operations
 *
 * Handles all database operations related to portfolio components including:
 * - Component CRUD operations
 * - Position management within sections
 * - Component filtering by type and section
 */
export class ComponentRepository extends BaseRepository {
  private readonly tableName = "components";

  /**
   * Find a component by ID
   *
   * @param componentId - Component ID to search for
   * @returns Promise<ComponentRow | null> - Component or null if not found
   */
  async findById(componentId: string): Promise<ComponentRow | null> {
    return this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("*").eq("id", componentId).single(),
      "Failed to find component",
      { componentId }
    );
  }

  /**
   * Find all components for a section
   *
   * @param sectionId - Section ID to get components for
   * @returns Promise<ComponentRow[]> - Array of components ordered by position
   */
  async findBySectionId(sectionId: string): Promise<ComponentRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("section_id", sectionId)
          .order("position", { ascending: true }),
      "Failed to find components by section ID",
      { sectionId }
    );
  }

  /**
   * Find components by section ID and type
   *
   * @param sectionId - Section ID to get components for
   * @param type - Component type to filter by
   * @returns Promise<ComponentRow[]> - Array of components of specified type
   */
  async findBySectionIdAndType(sectionId: string, type: ComponentType): Promise<ComponentRow[]> {
    return this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("*")
          .eq("section_id", sectionId)
          .eq("type", type)
          .order("position", { ascending: true }),
      "Failed to find components by section ID and type",
      { sectionId, type }
    );
  }

  /**
   * Create a new component
   *
   * @param component - Component data to insert
   * @returns Promise<ComponentRow> - Created component
   */
  async create(component: ComponentInsert): Promise<ComponentRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).insert(component).select("*").single(),
      "Failed to create component",
      { component }
    );
  }

  /**
   * Update an existing component
   *
   * @param componentId - Component ID to update
   * @param updates - Fields to update
   * @returns Promise<ComponentRow> - Updated component
   */
  async update(componentId: string, updates: ComponentUpdate): Promise<ComponentRow> {
    return this.executeQuery(
      async () => await this.supabase.from(this.tableName).update(updates).eq("id", componentId).select("*").single(),
      "Failed to update component",
      { componentId, updates }
    );
  }

  /**
   * Delete a component by ID
   *
   * @param componentId - Component ID to delete
   * @returns Promise<void>
   */
  async delete(componentId: string): Promise<void> {
    await this.executeQuery(
      async () => await this.supabase.from(this.tableName).delete().eq("id", componentId),
      "Failed to delete component",
      { componentId }
    );
  }

  /**
   * Check if a component exists by ID
   *
   * @param componentId - Component ID to check
   * @returns Promise<boolean> - True if component exists
   */
  async exists(componentId: string): Promise<boolean> {
    const result = await this.executeQueryNullable(
      async () => await this.supabase.from(this.tableName).select("id").eq("id", componentId).single(),
      "Failed to check component existence",
      { componentId }
    );

    return result !== null;
  }

  /**
   * Get the next position for a new component in a section
   *
   * @param sectionId - Section ID to get next position for
   * @returns Promise<number> - Next position number (starting from 1)
   */
  async getNextPosition(sectionId: string): Promise<number> {
    const result = await this.executeQueryArray(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select("position")
          .eq("section_id", sectionId)
          .order("position", { ascending: false })
          .limit(1),
      "Failed to get next position",
      { sectionId }
    );

    return result.length > 0 ? result[0].position + 1 : 1;
  }

  /**
   * Reorder components within a section
   *
   * @param sectionId - Section ID containing the components
   * @param componentUpdates - Array of {id, position} updates
   * @returns Promise<void>
   */
  async reorderComponents(sectionId: string, componentUpdates: { id: string; position: number }[]): Promise<void> {
    // Execute all position updates in a batch
    const updates = componentUpdates.map(
      ({ id, position }) =>
        this.supabase.from(this.tableName).update({ position }).eq("id", id).eq("section_id", sectionId) // Extra safety check
    );

    // Execute all updates
    const results = await Promise.all(updates);

    // Check if any updates failed
    const failedUpdates = results.filter((result) => result.error);
    if (failedUpdates.length > 0) {
      throw new Error(`Failed to reorder components: ${failedUpdates.map((r) => r.error?.message).join(", ")}`);
    }
  }

  /**
   * Move a component to a new position and adjust other components accordingly
   *
   * @param componentId - Component ID to move
   * @param newPosition - New position for the component
   * @returns Promise<void>
   */
  async moveComponent(componentId: string, newPosition: number): Promise<void> {
    // First, get the component to find its section
    const component = await this.findById(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    const sectionId = component.section_id;
    const currentPosition = component.position;

    if (currentPosition === newPosition) {
      return; // No change needed
    }

    // Get all components for the section to understand the current ordering
    const allComponents = await this.findBySectionId(sectionId);

    if (newPosition < currentPosition) {
      // Moving up: shift components between newPosition and currentPosition down by 1
      const componentsToShift = allComponents.filter(
        (c) => c.position >= newPosition && c.position < currentPosition && c.id !== componentId
      );

      await this.reorderComponents(sectionId, [
        { id: componentId, position: newPosition },
        ...componentsToShift.map((c) => ({ id: c.id, position: c.position + 1 })),
      ]);
    } else {
      // Moving down: shift components between currentPosition and newPosition up by 1
      const componentsToShift = allComponents.filter(
        (c) => c.position > currentPosition && c.position <= newPosition && c.id !== componentId
      );

      await this.reorderComponents(sectionId, [
        { id: componentId, position: newPosition },
        ...componentsToShift.map((c) => ({ id: c.id, position: c.position - 1 })),
      ]);
    }
  }

  /**
   * Delete all components for a section
   *
   * @param sectionId - Section ID to delete components for
   * @returns Promise<void>
   */
  async deleteBySectionId(sectionId: string): Promise<void> {
    await this.executeQuery(
      async () => await this.supabase.from(this.tableName).delete().eq("section_id", sectionId),
      "Failed to delete components by section ID",
      { sectionId }
    );
  }

  /**
   * Find components by portfolio ID (through sections join)
   *
   * @param portfolioId - Portfolio ID to get components for
   * @returns Promise<ComponentRow[]> - Array of components for the portfolio
   */
  async findByPortfolioId(portfolioId: string): Promise<ComponentRow[]> {
    const result = await this.executeQueryArray<ComponentWithSection>(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select(
            `
          *,
          sections!inner(portfolio_id)
        `
          )
          .eq("sections.portfolio_id", portfolioId)
          .order("sections.position", { ascending: true })
          .order("position", { ascending: true }),
      "Failed to find components by portfolio ID",
      { portfolioId }
    );

    return result.map((component) => ({
      id: component.id,
      section_id: component.section_id,
      type: component.type,
      data: component.data,
      position: component.position,
      created_at: component.created_at,
      updated_at: component.updated_at,
    }));
  }

  /**
   * Find components by portfolio ID with section information
   *
   * @param portfolioId - Portfolio ID to get components for
   * @returns Promise<Array<ComponentRow & { section_name: string; section_visible: boolean }>> - Components with section info
   */
  async findByPortfolioIdWithSectionInfo(
    portfolioId: string
  ): Promise<(ComponentRow & { section_name: string; section_visible: boolean })[]> {
    const result = await this.executeQueryArray<ComponentWithSectionInfo>(
      async () =>
        await this.supabase
          .from(this.tableName)
          .select(
            `
          *,
          sections!inner(name, visible, portfolio_id)
        `
          )
          .eq("sections.portfolio_id", portfolioId)
          .order("sections.position", { ascending: true })
          .order("position", { ascending: true }),
      "Failed to find components by portfolio ID with section info",
      { portfolioId }
    );

    return result.map((component) => ({
      id: component.id,
      section_id: component.section_id,
      type: component.type,
      data: component.data,
      position: component.position,
      created_at: component.created_at,
      updated_at: component.updated_at,
      section_name: component.sections.name,
      section_visible: component.sections.visible,
    }));
  }

  /**
   * Count components by type for a portfolio
   *
   * @param portfolioId - Portfolio ID to count components for
   * @returns Promise<Record<ComponentType, number>> - Count of each component type
   */
  async countByTypeForPortfolio(portfolioId: string): Promise<Record<ComponentType, number>> {
    const components = await this.findByPortfolioId(portfolioId);

    const counts: Record<ComponentType, number> = {
      text: 0,
      card: 0,
      pills: 0,
      social_links: 0,
      list: 0,
      image: 0,
      bio: 0,
    };

    components.forEach((component) => {
      counts[component.type]++;
    });

    return counts;
  }
}
