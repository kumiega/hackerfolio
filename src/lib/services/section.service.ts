import type { SupabaseClient } from "@/db/supabase.client";
import type { SectionDto, SectionListQuery, CreateSectionCommand, UpdateSectionCommand, ReorderCommand } from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";
import { AppError } from "@/lib/error-handler";

/**
 * Service for section-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SectionService {
  /**
   * Retrieves a paginated list of sections for a specific portfolio with sorting
   *
   * @param supabase - Supabase client instance from context.locals
   * @param portfolioId - ID of the portfolio to retrieve sections for
   * @param userId - ID of the user making the request (for ownership verification)
   * @param query - Pagination and sorting parameters
   * @returns Promise<{ sections: SectionDto[]; total: number }> - Sections data with total count
   * @throws AppError with code 'DATABASE_ERROR' if database query fails
   */
  static async listSections(
    supabase: SupabaseClient,
    portfolioId: string,
    userId: string,
    query: SectionListQuery
  ): Promise<{ sections: SectionDto[]; total: number }> {
    // Step 1: Apply default values for pagination and sorting
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 100); // Cap at 100
    const sort = query.sort || "position";
    const order = query.order || "asc";

    // Step 2: Calculate offset for pagination
    const offset = (page - 1) * perPage;

    // Step 3: Validate sort field is allowed
    const allowedSortFields = ["position", "name", "created_at"];
    if (!allowedSortFields.includes(sort)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid sort field", {
        userId,
        portfolioId,
        details: { sort },
      });
    }

    // Step 4: Validate order is allowed
    if (!["asc", "desc"].includes(order)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid sort order", {
        userId,
        portfolioId,
        details: { order },
      });
    }

    // Step 5: Query sections with ownership verification
    // RLS policy ensures user can only access sections from portfolios they own
    const queryBuilder = supabase
      .from("sections")
      .select("id, name, position, visible", { count: "exact" })
      .eq("portfolio_id", portfolioId);

    // Step 6: Apply sorting
    if (order === "desc") {
      queryBuilder.order(sort, { ascending: false });
    } else {
      queryBuilder.order(sort, { ascending: true });
    }

    // Step 7: Apply pagination
    queryBuilder.range(offset, offset + perPage - 1);

    const { data: sections, error, count } = await queryBuilder;

    // Step 8: Handle database errors
    if (error) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId,
        cause: error,
      });
    }

    // Step 9: Return sections data with total count
    return {
      sections: sections || [],
      total: count || 0,
    };
  }

  /**
   * Creates a new section for a specific portfolio
   *
   * @param supabase - Supabase client instance from context.locals
   * @param portfolioId - ID of the portfolio to add the section to
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Section creation command with name and visibility
   * @returns Promise<SectionDto> - Created section data
   * @throws AppError with code 'SECTION_LIMIT_REACHED' if portfolio already has 10 sections
   * @throws AppError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createSection(
    supabase: SupabaseClient,
    portfolioId: string,
    userId: string,
    command: CreateSectionCommand
  ): Promise<SectionDto> {
    // Step 1: Check section count limit (maximum 10 sections per portfolio)
    const { count: sectionCount, error: countError } = await supabase
      .from("sections")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_id", portfolioId);

    if (countError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId,
        cause: countError,
      });
    }

    if ((sectionCount || 0) >= 10) {
      throw new AppError(ERROR_CODES.SECTION_LIMIT_REACHED, "Maximum of 10 sections allowed per portfolio", {
        userId,
        portfolioId,
        details: { currentCount: sectionCount },
      });
    }

    // Step 2: Get the current maximum position for ordering
    const { data: maxPositionData, error: maxPosError } = await supabase
      .from("sections")
      .select("position")
      .eq("portfolio_id", portfolioId)
      .order("position", { ascending: false })
      .limit(1);

    if (maxPosError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId,
        cause: maxPosError,
      });
    }

    const nextPosition = (maxPositionData?.[0]?.position || 0) + 1;

    // Step 2: Insert new section record
    const { data: section, error } = await supabase
      .from("sections")
      .insert({
        portfolio_id: portfolioId,
        name: command.name,
        visible: command.visible ?? true,
        position: nextPosition,
      })
      .select("id, name, position, visible")
      .single();

    // Step 3: Handle database errors
    if (error) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        portfolioId,
        cause: error,
      });
    }

    // Step 4: Return created section data
    return section;
  }

  /**
   * Updates an existing section
   *
   * @param supabase - Supabase client instance from context.locals
   * @param sectionId - ID of the section to update
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Section update command with name and/or visibility
   * @returns Promise<SectionDto> - Updated section data
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database update fails
   */
  static async updateSection(
    supabase: SupabaseClient,
    sectionId: string,
    userId: string,
    command: UpdateSectionCommand
  ): Promise<SectionDto> {
    // Step 1: Update section record with ownership verification
    // RLS policy ensures user can only update sections from portfolios they own
    const { data: section, error } = await supabase
      .from("sections")
      .update({
        name: command.name,
        visible: command.visible,
      })
      .eq("id", sectionId)
      .select("id, name, position, visible")
      .single();

    // Step 2: Handle database errors
    if (error) {
      // If no row found, section doesn't exist or user doesn't own it
      if (error.code === "PGRST116") {
        throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, { userId, details: { sectionId } });
      }
      // For other errors, throw database error
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: error,
      });
    }

    // Step 3: Return updated section data
    return section;
  }

  /**
   * Deletes a section and reorders remaining sections
   *
   * @param supabase - Supabase client instance from context.locals
   * @param sectionId - ID of the section to delete
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<void>
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async deleteSection(supabase: SupabaseClient, sectionId: string, userId: string): Promise<void> {
    // Step 1: Get section details to determine portfolio and position
    const { data: sectionToDelete, error: fetchError } = await supabase
      .from("sections")
      .select("portfolio_id, position")
      .eq("id", sectionId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, { userId, details: { sectionId } });
      }
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: fetchError,
      });
    }

    // Step 2: Delete the section
    const { error: deleteError } = await supabase.from("sections").delete().eq("id", sectionId);

    if (deleteError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: deleteError,
      });
    }

    // Step 3: Reorder remaining sections by decrementing positions greater than deleted position
    // First get all sections that need to be reordered
    const { data: sectionsToReorder, error: fetchReorderError } = await supabase
      .from("sections")
      .select("id, position")
      .eq("portfolio_id", sectionToDelete.portfolio_id)
      .gt("position", sectionToDelete.position);

    if (fetchReorderError) {
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch sections for reordering after delete:", fetchReorderError);
    } else if (sectionsToReorder) {
      // Update each section individually
      for (const section of sectionsToReorder) {
        const { error: updateError } = await supabase
          .from("sections")
          .update({ position: section.position - 1 })
          .eq("id", section.id);

        if (updateError) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to update position for section ${section.id}:`, updateError);
        }
      }
    }
  }

  /**
   * Reorders a section by updating its position and shifting other sections
   *
   * @param supabase - Supabase client instance from context.locals
   * @param sectionId - ID of the section to reorder
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Reorder command with new position
   * @returns Promise<SectionDto[]> - Updated sections with new positions
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async reorderSection(
    supabase: SupabaseClient,
    sectionId: string,
    userId: string,
    command: ReorderCommand
  ): Promise<SectionDto[]> {
    // Step 1: Get section details
    const { data: section, error: fetchError } = await supabase
      .from("sections")
      .select("portfolio_id, position")
      .eq("id", sectionId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, { userId, details: { sectionId } });
      }
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: fetchError,
      });
    }

    // Step 2: Get current position and validate new position
    const currentPosition = section.position;
    const newPosition = command.position;

    if (currentPosition === newPosition) {
      // No change needed, return current sections
      const { data: currentSections, error: listError } = await supabase
        .from("sections")
        .select("id, name, position, visible")
        .eq("portfolio_id", section.portfolio_id)
        .order("position");

      if (listError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { sectionId },
          cause: listError,
        });
      }

      return currentSections || [];
    }

    // Step 3: Handle reordering logic
    if (newPosition < currentPosition) {
      // Moving up: increment positions between new and current position
      const { data: sectionsToShift, error: fetchShiftError } = await supabase
        .from("sections")
        .select("id, position")
        .eq("portfolio_id", section.portfolio_id)
        .gte("position", newPosition)
        .lt("position", currentPosition);

      if (fetchShiftError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { sectionId },
          cause: fetchShiftError,
        });
      }

      // Update each section individually
      if (sectionsToShift) {
        for (const sectionToShift of sectionsToShift) {
          const { error: shiftError } = await supabase
            .from("sections")
            .update({ position: sectionToShift.position + 1 })
            .eq("id", sectionToShift.id);

          if (shiftError) {
            throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
              userId,
              details: { sectionId },
              cause: shiftError,
            });
          }
        }
      }
    } else {
      // Moving down: decrement positions between current and new position
      const { data: sectionsToShift, error: fetchShiftError } = await supabase
        .from("sections")
        .select("id, position")
        .eq("portfolio_id", section.portfolio_id)
        .gt("position", currentPosition)
        .lte("position", newPosition);

      if (fetchShiftError) {
        throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          userId,
          details: { sectionId },
          cause: fetchShiftError,
        });
      }

      // Update each section individually
      if (sectionsToShift) {
        for (const sectionToShift of sectionsToShift) {
          const { error: shiftError } = await supabase
            .from("sections")
            .update({ position: sectionToShift.position - 1 })
            .eq("id", sectionToShift.id);

          if (shiftError) {
            throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
              userId,
              details: { sectionId },
              cause: shiftError,
            });
          }
        }
      }
    }

    // Step 4: Update the target section's position
    const { error: updateError } = await supabase
      .from("sections")
      .update({ position: newPosition })
      .eq("id", sectionId);

    if (updateError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: updateError,
      });
    }

    // Step 5: Return updated sections
    const { data: updatedSections, error: listError } = await supabase
      .from("sections")
      .select("id, name, position, visible")
      .eq("portfolio_id", section.portfolio_id)
      .order("position");

    if (listError) {
      throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        userId,
        details: { sectionId },
        cause: listError,
      });
    }

    return updatedSections || [];
  }
}
