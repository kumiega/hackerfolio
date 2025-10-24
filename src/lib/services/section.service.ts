import type { SectionDto, SectionListQuery, CreateSectionCommand, UpdateSectionCommand, ReorderCommand } from "@/types";
import { ERROR_CODES } from "@/lib/error-constants";
import { AppError } from "@/lib/error-handler";
import { repositories } from "@/lib/repositories";

/**
 * Service for section-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SectionService {
  /**
   * Retrieves a paginated list of sections for a specific portfolio with sorting
   *
   * @param portfolioId - ID of the portfolio to retrieve sections for
   * @param userId - ID of the user making the request (for ownership verification)
   * @param query - Pagination and sorting parameters
   * @returns Promise<{ sections: SectionDto[]; total: number }> - Sections data with total count
   * @throws AppError with code 'DATABASE_ERROR' if database query fails
   */
  static async listSections(
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

    // Step 5: Get sections from repository
    const sections = await repositories.sections.findByPortfolioId(portfolioId);

    // Step 6: Apply sorting
    sections.sort((a, b) => {
      if (sort === "position") {
        return order === "asc" ? a.position - b.position : b.position - a.position;
      } else if (sort === "name") {
        return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sort === "created_at") {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return order === "asc" ? aTime - bTime : bTime - aTime;
      }
      return 0;
    });

    // Step 7: Apply pagination
    const paginatedSections = sections.slice(offset, offset + perPage);

    // Step 8: Return sections data with total count
    return {
      sections: paginatedSections.map((section) => ({
        id: section.id,
        name: section.name,
        position: section.position,
        visible: section.visible,
      })),
      total: sections.length,
    };
  }

  /**
   * Creates a new section for a specific portfolio
   *
   * @param portfolioId - ID of the portfolio to add the section to
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Section creation command with name and visibility
   * @returns Promise<SectionDto> - Created section data
   * @throws AppError with code 'SECTION_LIMIT_REACHED' if portfolio already has 10 sections
   * @throws AppError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createSection(portfolioId: string, userId: string, command: CreateSectionCommand): Promise<SectionDto> {
    // Step 1: Check section count limit (maximum 10 sections per portfolio)
    const sectionsInPortfolio = await repositories.sections.findByPortfolioId(portfolioId);

    if (sectionsInPortfolio.length >= 10) {
      throw new AppError(ERROR_CODES.SECTION_LIMIT_REACHED, "Maximum of 10 sections allowed per portfolio", {
        userId,
        portfolioId,
        details: { currentCount: sectionsInPortfolio.length },
      });
    }

    // Step 2: Get the next position for ordering
    const nextPosition = await repositories.sections.getNextPosition(portfolioId);

    // Step 3: Create the section using repository
    const createdSection = await repositories.sections.create({
      portfolio_id: portfolioId,
      name: command.name,
      visible: command.visible ?? true,
      position: nextPosition,
    });

    // Step 4: Return created section data
    return {
      id: createdSection.id,
      name: createdSection.name,
      position: createdSection.position,
      visible: createdSection.visible,
    };
  }

  /**
   * Updates an existing section
   *
   * @param sectionId - ID of the section to update
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Section update command with name and/or visibility
   * @returns Promise<SectionDto> - Updated section data
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database update fails
   */
  static async updateSection(sectionId: string, userId: string, command: UpdateSectionCommand): Promise<SectionDto> {
    // Step 1: Update section record with ownership verification
    // RLS policy ensures user can only update sections from portfolios they own
    const updatedSection = await repositories.sections.update(sectionId, {
      name: command.name,
      visible: command.visible,
    });

    // Step 2: Return updated section data
    return {
      id: updatedSection.id,
      name: updatedSection.name,
      position: updatedSection.position,
      visible: updatedSection.visible,
    };
  }

  /**
   * Deletes a section and reorders remaining sections
   *
   * @param sectionId - ID of the section to delete
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<void>
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'CANNOT_DELETE_LAST_REQUIRED' if attempting to delete last section of unpublished portfolio
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async deleteSection(sectionId: string, userId: string): Promise<void> {
    // Step 1: Get section details
    const sectionToDelete = await repositories.sections.findById(sectionId);

    if (!sectionToDelete) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Check portfolio publish status and section count for unpublished portfolios
    const portfolio = await repositories.portfolios.findById(sectionToDelete.portfolio_id);

    if (!portfolio) {
      throw new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, undefined, {
        userId,
        details: { sectionId, portfolioId: sectionToDelete.portfolio_id },
      });
    }

    // Step 3: If portfolio is not published, ensure at least 1 section will remain
    if (!portfolio.is_published) {
      const sectionsInPortfolio = await repositories.sections.findByPortfolioId(sectionToDelete.portfolio_id);

      if (sectionsInPortfolio.length <= 1) {
        throw new AppError(
          ERROR_CODES.CANNOT_DELETE_LAST_REQUIRED,
          "Cannot delete the last section of an unpublished portfolio",
          {
            userId,
            details: { sectionId, portfolioId: sectionToDelete.portfolio_id, sectionCount: sectionsInPortfolio.length },
          }
        );
      }
    }

    // Step 4: Delete the section using repository
    await repositories.sections.delete(sectionId);
  }

  /**
   * Reorders a section by updating its position and shifting other sections
   *
   * @param sectionId - ID of the section to reorder
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Reorder command with new position
   * @returns Promise<SectionDto> - Updated section with new position
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'VALIDATION_ERROR' if position is out of bounds
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async reorderSection(sectionId: string, userId: string, command: ReorderCommand): Promise<SectionDto> {
    // Step 1: Get section details
    const section = await repositories.sections.findById(sectionId);

    if (!section) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Validate new position is within portfolio bounds
    const sectionsInPortfolio = await repositories.sections.findByPortfolioId(section.portfolio_id);
    const maxPosition = sectionsInPortfolio.length - 1;
    const newPosition = command.position;

    if (newPosition < 0 || newPosition > maxPosition) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Position must be between 0 and ${maxPosition}`, {
        userId,
        details: { sectionId, newPosition, maxPosition },
      });
    }

    // Step 3: Get current position and check if change is needed
    const currentPosition = section.position;

    if (currentPosition === newPosition) {
      // No change needed, return current section
      return {
        id: section.id,
        name: section.name,
        position: section.position,
        visible: section.visible,
      };
    }

    // Step 4: Use repository method to reorder sections
    await repositories.sections.reorderSections(section.portfolio_id, [{ id: sectionId, position: newPosition }]);

    // Step 5: Get the updated section
    const updatedSection = await repositories.sections.findById(sectionId);

    if (!updatedSection) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 6: Return updated section
    return {
      id: updatedSection.id,
      name: updatedSection.name,
      position: updatedSection.position,
      visible: updatedSection.visible,
    };
  }
}
