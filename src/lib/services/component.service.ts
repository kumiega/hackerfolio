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
import { repositories } from "@/lib/repositories";

/**
 * Service for component-related operations
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ComponentService {
  /**
   * Reorders a component by updating its position and shifting other components within the same section
   *
   * @param componentId - ID of the component to reorder
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Reorder command with new position
   * @returns Promise<ComponentDto> - Updated component data
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async reorderComponent(componentId: string, userId: string, command: ReorderCommand): Promise<ComponentDto> {
    // Step 1: Get component details including section_id and current position
    const component = await repositories.components.findById(componentId);

    if (!component) {
      throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
        userId,
        details: { componentId },
      });
    }

    // Step 2: Get current position and validate new position
    const currentPosition = component.position;
    const newPosition = command.position;

    if (currentPosition === newPosition) {
      // No change needed, return current component
      return {
        id: component.id,
        type: component.type,
        position: component.position,
        data: component.data,
      };
    }

    // Step 3: Validate new position is within section bounds
    const componentsInSection = await repositories.components.findBySectionId(component.section_id);
    const maxPosition = componentsInSection.length - 1;

    if (newPosition < 0 || newPosition > maxPosition) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Position must be between 0 and ${maxPosition}`, {
        userId,
        details: { componentId, newPosition, maxPosition },
      });
    }

    // Step 4: Use repository method to reorder components
    await repositories.components.reorderComponents(component.section_id, [{ id: componentId, position: newPosition }]);

    // Step 5: Get the updated component
    const updatedComponent = await repositories.components.findById(componentId);

    if (!updatedComponent) {
      throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
        userId,
        details: { componentId },
      });
    }

    // Step 6: Return updated component
    return {
      id: updatedComponent.id,
      type: updatedComponent.type,
      position: updatedComponent.position,
      data: updatedComponent.data,
    };
  }

  /**
   * Creates a new component for a specific section
   *
   * @param sectionId - ID of the section to add the component to
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Component creation command with type and data
   * @returns Promise<ComponentDto> - Created component data
   * @throws AppError with code 'COMPONENT_LIMIT_REACHED' if portfolio already has 15 components
   * @throws AppError with code 'DATABASE_ERROR' if database insertion fails
   */
  static async createComponent(
    sectionId: string,
    userId: string,
    command: CreateComponentCommand
  ): Promise<ComponentDto> {
    // Step 1: Get section details to find portfolio ID
    const section = await repositories.sections.findById(sectionId);

    if (!section) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Check component count limit (maximum 15 components per portfolio)
    const componentsInPortfolio = await repositories.components.findByPortfolioId(section.portfolio_id);

    if (componentsInPortfolio.length >= 15) {
      throw new AppError(ERROR_CODES.COMPONENT_LIMIT_REACHED, "Maximum of 15 components allowed per portfolio", {
        userId,
        portfolioId: section.portfolio_id,
        details: { currentCount: componentsInPortfolio.length },
      });
    }

    // Step 3: Get the next position for ordering
    const nextPosition = await repositories.components.getNextPosition(sectionId);

    // Step 4: Create the component using repository
    const createdComponent = await repositories.components.create({
      section_id: sectionId,
      type: command.type,
      data: command.data as Json,
      position: nextPosition,
    });

    // Step 5: Return created component data
    return {
      id: createdComponent.id,
      type: createdComponent.type,
      position: createdComponent.position,
      data: createdComponent.data,
    };
  }

  /**
   * Updates an existing component
   *
   * @param componentId - ID of the component to update
   * @param userId - ID of the user making the request (for ownership verification)
   * @param command - Component update command with data
   * @returns Promise<ComponentDto> - Updated component data
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database update fails
   */
  static async updateComponent(
    componentId: string,
    userId: string,
    command: UpdateComponentCommand
  ): Promise<ComponentDto> {
    // Step 1: Update component record with ownership verification
    // RLS policy ensures user can only update components from sections they own
    const updatedComponent = await repositories.components.update(componentId, {
      data: command.data as Json,
    });

    // Step 2: Return updated component data
    return {
      id: updatedComponent.id,
      type: updatedComponent.type,
      position: updatedComponent.position,
      data: updatedComponent.data,
    };
  }

  /**
   * Deletes a component and reorders remaining components
   *
   * @param componentId - ID of the component to delete
   * @param userId - ID of the user making the request (for ownership verification)
   * @returns Promise<void>
   * @throws AppError with code 'COMPONENT_NOT_FOUND' if component doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async deleteComponent(componentId: string, userId: string): Promise<void> {
    // Step 1: Get component details to determine section and position
    const componentToDelete = await repositories.components.findById(componentId);

    if (!componentToDelete) {
      throw new AppError(ERROR_CODES.COMPONENT_NOT_FOUND, undefined, {
        userId,
        details: { componentId },
      });
    }

    // Step 2: Delete the component using repository
    await repositories.components.delete(componentId);
  }

  /**
   * Lists components for a specific section with filtering, sorting, and pagination
   *
   * @param sectionId - ID of the section to list components from
   * @param userId - ID of the user making the request (for ownership verification)
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Promise<{ components: ComponentDto[]; total: number }> - Components array and total count
   * @throws AppError with code 'SECTION_NOT_FOUND' if section doesn't exist or user doesn't own it
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async listComponents(
    sectionId: string,
    userId: string,
    query: ComponentListQuery
  ): Promise<{ components: ComponentDto[]; total: number }> {
    // Step 1: Verify section exists and user owns it (RLS will handle ownership)
    const sectionExists = await repositories.sections.exists(sectionId);

    if (!sectionExists) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Get components with filtering
    let components = await repositories.components.findBySectionId(sectionId);

    // Apply type filter if specified
    if (query.type) {
      components = components.filter((component) => component.type === query.type);
    }

    // Apply search filter if specified (search within JSONB data)
    if (query.q && query.q.trim()) {
      const searchTerm = query.q.trim().toLowerCase();
      components = components.filter((component) => {
        // Simple text search within JSONB data
        const dataString = JSON.stringify(component.data).toLowerCase();
        return dataString.includes(searchTerm);
      });
    }

    // Step 3: Apply sorting
    const sortColumn = query.sort === "created_at" ? "created_at" : "position";
    components.sort((a, b) => {
      if (sortColumn === "created_at") {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return query.order === "asc" ? aTime - bTime : bTime - aTime;
      } else {
        return query.order === "asc" ? a.position - b.position : b.position - a.position;
      }
    });

    // Step 4: Apply pagination
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const offset = (page - 1) * perPage;
    const paginatedComponents = components.slice(offset, offset + perPage);

    // Step 5: Return paginated results with total count
    return {
      components: paginatedComponents.map((component) => ({
        id: component.id,
        type: component.type,
        position: component.position,
        data: component.data,
      })),
      total: components.length,
    };
  }

  /**
   * Creates multiple project card components in batch
   *
   * @param sectionId - ID of the section where components will be created
   * @param userId - ID of the user making the request
   * @param projectCards - Array of project card data to create components from
   * @returns Promise<ComponentDto[]> - Array of created component data
   * @throws AppError with code 'COMPONENT_LIMIT_REACHED' if adding components would exceed portfolio limit
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async createProjectCardComponents(
    sectionId: string,
    userId: string,
    projectCards: {
      repo_url: string;
      title: string;
      summary: string;
      tech: string[];
    }[]
  ): Promise<ComponentDto[]> {
    if (projectCards.length === 0) {
      return [];
    }

    // Step 1: Get section details to find portfolio ID
    const section = await repositories.sections.findById(sectionId);

    if (!section) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Check component count limit
    const componentsInPortfolio = await repositories.components.findByPortfolioId(section.portfolio_id);

    if (componentsInPortfolio.length + projectCards.length > 15) {
      throw new AppError(
        ERROR_CODES.COMPONENT_LIMIT_REACHED,
        `Cannot create ${projectCards.length} components. Portfolio already has ${componentsInPortfolio.length} components (maximum 15 allowed)`,
        {
          userId,
          portfolioId: section.portfolio_id,
          details: { currentCount: componentsInPortfolio.length, requestedCount: projectCards.length, maxAllowed: 15 },
        }
      );
    }

    // Step 3: Get the next position for ordering
    const nextPosition = await repositories.components.getNextPosition(sectionId);

    // Step 4: Prepare component data for batch insertion
    const componentsToInsert = projectCards.map((card, index) => ({
      section_id: sectionId,
      type: "card" as const,
      position: nextPosition + index,
      data: {
        repo_url: card.repo_url,
        title: card.title,
        summary: card.summary,
        tech: card.tech,
      } as Json,
    }));

    // Step 5: Create components using repository (we'll need to implement batch create)
    const createdComponents: ComponentDto[] = [];
    for (const componentData of componentsToInsert) {
      const createdComponent = await repositories.components.create(componentData);
      createdComponents.push({
        id: createdComponent.id,
        type: createdComponent.type,
        position: createdComponent.position,
        data: createdComponent.data,
      });
    }

    // Step 6: Return created components
    return createdComponents;
  }

  /**
   * Creates multiple components of different types in batch
   *
   * @param sectionId - ID of the section where components will be created
   * @param userId - ID of the user making the request
   * @param componentCommands - Array of component creation commands
   * @returns Promise<ComponentDto[]> - Array of created component data
   * @throws AppError with code 'COMPONENT_LIMIT_REACHED' if adding components would exceed portfolio limit
   * @throws AppError with code 'DATABASE_ERROR' if database operations fail
   */
  static async createComponents(
    sectionId: string,
    userId: string,
    componentCommands: CreateComponentCommand[]
  ): Promise<ComponentDto[]> {
    if (componentCommands.length === 0) {
      return [];
    }

    // Step 1: Get section details to find portfolio ID
    const section = await repositories.sections.findById(sectionId);

    if (!section) {
      throw new AppError(ERROR_CODES.SECTION_NOT_FOUND, undefined, {
        userId,
        details: { sectionId },
      });
    }

    // Step 2: Check component count limit
    const componentsInPortfolio = await repositories.components.findByPortfolioId(section.portfolio_id);

    if (componentsInPortfolio.length + componentCommands.length > 15) {
      throw new AppError(
        ERROR_CODES.COMPONENT_LIMIT_REACHED,
        `Cannot create ${componentCommands.length} components. Portfolio already has ${componentsInPortfolio.length} components (maximum 15 allowed)`,
        {
          userId,
          portfolioId: section.portfolio_id,
          details: {
            currentCount: componentsInPortfolio.length,
            requestedCount: componentCommands.length,
            maxAllowed: 15,
          },
        }
      );
    }

    // Step 3: Get the next position for ordering
    const nextPosition = await repositories.components.getNextPosition(sectionId);

    // Step 4: Create components using repository
    const createdComponents: ComponentDto[] = [];
    for (let i = 0; i < componentCommands.length; i++) {
      const command = componentCommands[i];
      const createdComponent = await repositories.components.create({
        section_id: sectionId,
        type: command.type,
        position: nextPosition + i,
        data: command.data as Json,
      });

      createdComponents.push({
        id: createdComponent.id,
        type: createdComponent.type,
        position: createdComponent.position,
        data: createdComponent.data,
      });
    }

    // Step 5: Return created components
    return createdComponents;
  }
}
