import type { SupabaseClient } from "@/db/supabase.client";
import type { Json } from "@/db/database.types";
import type {
  ComponentDto,
  CreateComponentCommand,
  UpdateComponentCommand,
  ReorderCommand,
  ComponentListQuery,
} from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";
import { AppError } from "@/lib/error-handler";

/**
 * Service for component-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ComponentService {
  /**
   * Reorders a component by updating its position and shifting other components within the same section
   *
   * @param supabase - Supabase client instance from context.locals
   * @param componentId - ID of the component to reorder
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Reorder command with new position
   * @returns Promise<ComponentDto> - Updated component data
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async reorderComponent(
    supabase: SupabaseClient,
    componentId: string,
    userId: string,
    command: ReorderCommand
  ): Promise<ComponentDto> {
    // Step 1: Get component details including section_id and current position
    const { data: component, error: fetchError } = await supabase
      .from("components")
      .select("section_id, position")
      .eq("id", componentId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
          userId,
          details: { componentId },
        });
      }
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: fetchError,
      });
    }

    // Step 2: Get current position and validate new position
    const currentPosition = component.position;
    const newPosition = command.position;

    if (currentPosition === newPosition) {
      // No change needed, return current component
      const { data: currentComponent, error: fetchCurrentError } = await supabase
        .from("components")
        .select("id, type, position, data")
        .eq("id", componentId)
        .single();

      if (fetchCurrentError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { componentId },
          cause: fetchCurrentError,
        });
      }

      return currentComponent;
    }

    // Step 3: Validate new position is within section bounds (0 to component count - 1)
    const { count: componentCount, error: countError } = await supabase
      .from("components")
      .select("*", { count: "exact", head: true })
      .eq("section_id", component.section_id);

    if (countError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId, sectionId: component.section_id },
        cause: countError,
      });
    }

    const maxPosition = (componentCount || 1) - 1;
    if (newPosition < 0 || newPosition > maxPosition) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Position must be between 0 and ${maxPosition}`, {
        userId,
        details: { componentId, newPosition, maxPosition },
      });
    }

    // Step 4: Handle reordering logic
    if (newPosition < currentPosition) {
      // Moving up: increment positions between new and current position
      const { data: componentsToShift, error: fetchShiftError } = await supabase
        .from("components")
        .select("id, position")
        .eq("section_id", component.section_id)
        .gte("position", newPosition)
        .lt("position", currentPosition);

      if (fetchShiftError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { componentId, sectionId: component.section_id },
          cause: fetchShiftError,
        });
      }

      // Update each component individually
      if (componentsToShift) {
        for (const componentToShift of componentsToShift) {
          const { error: shiftError } = await supabase
            .from("components")
            .update({ position: componentToShift.position + 1 })
            .eq("id", componentToShift.id);

          if (shiftError) {
            throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
              userId,
              details: { componentId, sectionId: component.section_id },
              cause: shiftError,
            });
          }
        }
      }
    } else {
      // Moving down: decrement positions between current and new position
      const { data: componentsToShift, error: fetchShiftError } = await supabase
        .from("components")
        .select("id, position")
        .eq("section_id", component.section_id)
        .gt("position", currentPosition)
        .lte("position", newPosition);

      if (fetchShiftError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { componentId, sectionId: component.section_id },
          cause: fetchShiftError,
        });
      }

      // Update each component individually
      if (componentsToShift) {
        for (const componentToShift of componentsToShift) {
          const { error: shiftError } = await supabase
            .from("components")
            .update({ position: componentToShift.position - 1 })
            .eq("id", componentToShift.id);

          if (shiftError) {
            throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
              userId,
              details: { componentId, sectionId: component.section_id },
              cause: shiftError,
            });
          }
        }
      }
    }

    // Step 5: Update the target component's position
    const { error: updateError } = await supabase
      .from("components")
      .update({ position: newPosition })
      .eq("id", componentId);

    if (updateError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: updateError,
      });
    }

    // Step 6: Return updated component
    const { data: updatedComponent, error: fetchUpdatedError } = await supabase
      .from("components")
      .select("id, type, position, data")
      .eq("id", componentId)
      .single();

    if (fetchUpdatedError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: fetchUpdatedError,
      });
    }

    return updatedComponent;
  }

  /**
   * Creates a new component for a specific section
   *
   * @param supabase - Supabase client instance from context.locals
   * @param sectionId - ID of the section to add the component to
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Component creation command with type and data
   * @returns Promise<ComponentDto> - Created component data
   * @throws AppError with code 'COMPONENT_LIMIT_REACHED' if portfolio already has 15 components
   * @throws AppError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createComponent(
    supabase: SupabaseClient,
    sectionId: string,
    userId: string,
    command: CreateComponentCommand
  ): Promise<ComponentDto> {
    // Step 1: Get portfolio ID for the section
    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("portfolio_id")
      .eq("id", sectionId)
      .single();

    if (sectionError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        cause: sectionError,
      });
    }

    // Step 2: Get all section IDs for the portfolio
    const { data: sectionIds, error: sectionsError } = await supabase
      .from("sections")
      .select("id")
      .eq("portfolio_id", sectionData.portfolio_id);

    if (sectionsError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId: sectionData.portfolio_id,
        cause: sectionsError,
      });
    }

    const sectionIdArray = sectionIds?.map((s) => s.id) || [];

    // Step 3: Check component count limit (maximum 15 components per portfolio)
    const { count: componentCount, error: countError } = await supabase
      .from("components")
      .select("*", { count: "exact", head: true })
      .in("section_id", sectionIdArray);

    if (countError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId: sectionData.portfolio_id,
        cause: countError,
      });
    }

    if ((componentCount || 0) >= 15) {
      throw new AppError(ERROR_CODES.COMPONENT_LIMIT_REACHED, "Maximum of 15 components allowed per portfolio", {
        userId,
        portfolioId: sectionData.portfolio_id,
        details: { currentCount: componentCount },
      });
    }

    // Step 3: Get the current maximum position for ordering
    const { data: maxPositionData, error: maxPosError } = await supabase
      .from("components")
      .select("position")
      .eq("section_id", sectionId)
      .order("position", { ascending: false })
      .limit(1);

    if (maxPosError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        cause: maxPosError,
      });
    }

    const nextPosition = (maxPositionData?.[0]?.position || 0) + 1;

    // Step 4: Insert new component record
    const { data: component, error } = await supabase
      .from("components")
      .insert({
        section_id: sectionId,
        type: command.type,
        data: command.data as Json,
        position: nextPosition,
      })
      .select("id, type, position, data")
      .single();

    // Step 5: Handle database errors
    if (error) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId: sectionData.portfolio_id,
        cause: error,
      });
    }

    // Step 6: Return created component data
    return component;
  }

  /**
   * Updates an existing component
   *
   * @param supabase - Supabase client instance from context.locals
   * @param componentId - ID of the component to update
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Component update command with data
   * @returns Promise<ComponentDto> - Updated component data
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database update fails
   */
  static async updateComponent(
    supabase: SupabaseClient,
    componentId: string,
    userId: string,
    command: UpdateComponentCommand
  ): Promise<ComponentDto> {
    // Step 1: Update component record with ownership verification
    // RLS policy ensures user can only update components from sections they own
    const { data: component, error } = await supabase
      .from("components")
      .update({
        data: command.data as Json,
      })
      .eq("id", componentId)
      .select("id, type, position, data")
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, component doesn't exist or user doesn't own it
      if (error.code === "PGRST116") {
        throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
          userId,
          details: { componentId },
        });
      }
      // For other errors, throw database error
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: error,
      });
    }

    // Step 3: Return updated component data
    return component;
  }

  /**
   * Deletes a component and reorders remaining components
   *
   * @param supabase - Supabase client instance from context.locals
   * @param componentId - ID of the component to delete
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<void>
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async deleteComponent(supabase: SupabaseClient, componentId: string, userId: string): Promise<void> {
    // Step 1: Get component details to determine section and position
    const { data: componentToDelete, error: fetchError } = await supabase
      .from("components")
      .select("section_id, position")
      .eq("id", componentId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
          userId,
          details: { componentId },
        });
      }
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: fetchError,
      });
    }

    // Step 2: Delete the component
    const { error: deleteError } = await supabase.from("components").delete().eq("id", componentId);

    if (deleteError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { componentId },
        cause: deleteError,
      });
    }

    // Step 3: Reorder remaining components by decrementing positions greater than deleted position
    // First get all components that need to be reordered
    const { data: componentsToReorder, error: fetchReorderError } = await supabase
      .from("components")
      .select("id, position")
      .eq("section_id", componentToDelete.section_id)
      .gt("position", componentToDelete.position);

    if (fetchReorderError) {
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch components for reordering after delete:", fetchReorderError);
    } else if (componentsToReorder) {
      // Update each component individually
      for (const component of componentsToReorder) {
        const { error: updateError } = await supabase
          .from("components")
          .update({ position: component.position - 1 })
          .eq("id", component.id);

        if (updateError) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to update position for component ${component.id}:`, updateError);
        }
      }
    }
  }

  /**
   * Lists components for a specific section with filtering, sorting, and pagination
   *
   * @param supabase - Supabase client instance from context.locals
   * @param sectionId - ID of the section to list components from
   * @param userId - ID of the user making the request (for ownership verification)
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Promise<{ components: ComponentDto[]; total: number }> - Components array and total count
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async listComponents(
    supabase: SupabaseClient,
    sectionId: string,
    userId: string,
    query: ComponentListQuery
  ): Promise<{ components: ComponentDto[]; total: number }> {
    // Step 1: Verify section exists and user owns it (RLS will handle ownership)
    const { count: sectionCount, error: sectionError } = await supabase
      .from("sections")
      .select("*", { count: "exact", head: true })
      .eq("id", sectionId);

    if (sectionError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: sectionError,
      });
    }

    if (!sectionCount || sectionCount === 0) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Build query with filtering
    let componentsQuery = supabase
      .from("components")
      .select("id, type, position, data", { count: "exact" })
      .eq("section_id", sectionId);

    // Apply type filter if specified
    if (query.type) {
      componentsQuery = componentsQuery.eq("type", query.type);
    }

    // Apply search filter if specified (search within JSONB data)
    if (query.q && query.q.trim()) {
      // Use PostgreSQL's text search capabilities on JSONB data
      // This searches for the query string within any text fields in the JSONB data
      componentsQuery = componentsQuery.textSearch("data", query.q.trim(), {
        type: "websearch",
        config: "english",
      });
    }

    // Step 3: Apply sorting
    const sortColumn = query.sort === "created_at" ? "created_at" : "position";
    componentsQuery = componentsQuery.order(sortColumn, { ascending: query.order === "asc" });

    // Step 4: Apply pagination
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const offset = (page - 1) * perPage;
    componentsQuery = componentsQuery.range(offset, offset + perPage - 1);

    // Step 5: Execute query
    const { data: components, error: fetchError, count } = await componentsQuery;

    if (fetchError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId, query },
        cause: fetchError,
      });
    }

    // Step 6: Return paginated results with total count
    return {
      components: components || [],
      total: count || 0,
    };
  }
}
