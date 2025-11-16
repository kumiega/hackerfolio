import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PortfolioService } from "../../../src/lib/services/portfolio.service";
import { AppError } from "../../../src/lib/error-handler";
import { ERROR_CODES } from "../../../src/lib/error-constants";
import type { PortfolioDto, CreatePortfolioCommand, UpdatePortfolioCommand } from "../../../src/types";

// Mock the repositories module
vi.mock("../../../src/lib/repositories", () => ({
  repositories: {
    portfolios: {
      findByUserId: vi.fn(),
      userHasPortfolio: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      publish: vi.fn(),
    },
  },
}));

// Mock Supabase client
vi.mock("../../../src/db/supabase.client", () => ({
  createClient: vi.fn(),
}));

import { repositories } from "../../../src/lib/repositories";
import type { SupabaseClient } from "../../../src/db/supabase.client";

// Mock data
const mockPortfolio: PortfolioDto = {
  id: "portfolio-123",
  user_id: "user-123",
  draft_data: {
    bio: {
      full_name: "John Doe",
      position: "Developer",
      summary: "Test summary",
      avatar_url: "avatar.jpg",
      social_links: {
        github: "johndoe",
        linkedin: "john-doe",
      },
    },
    sections: [
      {
        id: "section-1",
        title: "Projects",
        slug: "projects",
        visible: true,
        components: [
          {
            id: "component-1",
            type: "text",
            data: { content: "Test content" },
          },
        ],
      },
    ],
  },
  published_data: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  last_published_at: null,
};

const mockPublishedPortfolio: PortfolioDto = {
  ...mockPortfolio,
  published_data: mockPortfolio.draft_data,
  last_published_at: "2024-01-02T00:00:00Z",
};

describe("PortfolioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getUserPortfolio", () => {
    it("should return portfolio when found", async () => {
      // Arrange
      const userId = "user-123";
      vi.mocked(repositories.portfolios.findByUserId).mockResolvedValue(mockPortfolio);

      // Act
      const result = await PortfolioService.getUserPortfolio(userId);

      // Assert
      expect(result).toEqual(mockPortfolio);
      expect(repositories.portfolios.findByUserId).toHaveBeenCalledWith(userId);
      expect(repositories.portfolios.findByUserId).toHaveBeenCalledTimes(1);
    });

    it("should return null when portfolio not found", async () => {
      // Arrange
      const userId = "user-123";
      vi.mocked(repositories.portfolios.findByUserId).mockResolvedValue(null);

      // Act
      const result = await PortfolioService.getUserPortfolio(userId);

      // Assert
      expect(result).toBeNull();
      expect(repositories.portfolios.findByUserId).toHaveBeenCalledWith(userId);
    });

    it("should propagate database errors", async () => {
      // Arrange
      const userId = "user-123";
      const dbError = new Error("Database connection failed");
      vi.mocked(repositories.portfolios.findByUserId).mockRejectedValue(dbError);

      // Act & Assert
      await expect(PortfolioService.getUserPortfolio(userId)).rejects.toThrow();
      expect(repositories.portfolios.findByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe("checkPortfolioExists", () => {
    it("should return true when portfolio exists", async () => {
      // Arrange
      const userId = "user-123";
      vi.mocked(repositories.portfolios.userHasPortfolio).mockResolvedValue(true);

      // Act
      const result = await PortfolioService.checkPortfolioExists(userId);

      // Assert
      expect(result).toBe(true);
      expect(repositories.portfolios.userHasPortfolio).toHaveBeenCalledWith(userId);
    });

    it("should return false when portfolio does not exist", async () => {
      // Arrange
      const userId = "user-123";
      vi.mocked(repositories.portfolios.userHasPortfolio).mockResolvedValue(false);

      // Act
      const result = await PortfolioService.checkPortfolioExists(userId);

      // Assert
      expect(result).toBe(false);
      expect(repositories.portfolios.userHasPortfolio).toHaveBeenCalledWith(userId);
    });

    it("should propagate database errors", async () => {
      // Arrange
      const userId = "user-123";
      const dbError = new Error("Database connection failed");
      vi.mocked(repositories.portfolios.userHasPortfolio).mockRejectedValue(dbError);

      // Act & Assert
      await expect(PortfolioService.checkPortfolioExists(userId)).rejects.toThrow();
      expect(repositories.portfolios.userHasPortfolio).toHaveBeenCalledWith(userId);
    });
  });

  describe("createPortfolio", () => {
    it("should create portfolio with provided draft_data", async () => {
      // Arrange
      const userId = "user-123";
      const command: CreatePortfolioCommand = {
        draft_data: mockPortfolio.draft_data,
      };
      const expectedPortfolio = { ...mockPortfolio };
      vi.mocked(repositories.portfolios.create).mockResolvedValue(expectedPortfolio);

      // Act
      const result = await PortfolioService.createPortfolio(userId, command);

      // Assert
      expect(result).toEqual(expectedPortfolio);
      expect(repositories.portfolios.create).toHaveBeenCalledWith({
        user_id: userId,
        draft_data: command.draft_data,
      });
    });

    it("should create portfolio with default draft_data when not provided", async () => {
      // Arrange
      const userId = "user-123";
      const command: CreatePortfolioCommand = {};
      const expectedPortfolio = {
        ...mockPortfolio,
        draft_data: { ...mockPortfolio.draft_data, sections: [] },
      };
      vi.mocked(repositories.portfolios.create).mockResolvedValue(expectedPortfolio);

      // Act
      const result = await PortfolioService.createPortfolio(userId, command);

      // Assert
      expect(result).toEqual(expectedPortfolio);
      expect(repositories.portfolios.create).toHaveBeenCalledWith({
        user_id: userId,
        draft_data: { sections: [] },
      });
    });

    it("should propagate database errors", async () => {
      // Arrange
      const userId = "user-123";
      const command: CreatePortfolioCommand = { draft_data: mockPortfolio.draft_data };
      const dbError = new Error("Database connection failed");
      vi.mocked(repositories.portfolios.create).mockRejectedValue(dbError);

      // Act & Assert
      await expect(PortfolioService.createPortfolio(userId, command)).rejects.toThrow();
      expect(repositories.portfolios.create).toHaveBeenCalledWith({
        user_id: userId,
        draft_data: command.draft_data,
      });
    });
  });

  describe("updatePortfolio", () => {
    it("should successfully update portfolio with valid data", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const command: UpdatePortfolioCommand = {
        draft_data: {
          bio: mockPortfolio.draft_data.bio,
          sections: [
            {
              id: "section-1",
              title: "Updated Projects",
              slug: "projects",
              visible: true,
              components: [
                {
                  id: "component-1",
                  type: "text",
                  data: { content: "Updated content" },
                },
              ],
            },
          ],
        },
      };
      const existingPortfolio = { ...mockPortfolio };
      const updatedPortfolio = {
        ...mockPortfolio,
        draft_data: { ...mockPortfolio.draft_data, ...command.draft_data },
      };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);
      vi.mocked(repositories.portfolios.update).mockResolvedValue(updatedPortfolio);

      // Act
      const result = await PortfolioService.updatePortfolio(portfolioId, userId, command);

      // Assert
      expect(result).toEqual(updatedPortfolio);
      expect(repositories.portfolios.findById).toHaveBeenCalledWith(portfolioId);
      expect(repositories.portfolios.update).toHaveBeenCalledWith(portfolioId, {
        draft_data: command.draft_data,
      });
    });

    it("should merge partial updates with existing data", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const command: UpdatePortfolioCommand = {
        draft_data: {
          bio: mockPortfolio.draft_data.bio,
          sections: [
            {
              id: "section-1",
              title: "Updated Projects",
              slug: "projects",
              visible: true,
              components: [
                {
                  id: "component-1",
                  type: "text",
                  data: { content: "Updated content" },
                },
              ],
            },
          ],
        },
      };
      const existingPortfolio = { ...mockPortfolio };
      const expectedMergedData = {
        ...existingPortfolio.draft_data,
        ...command.draft_data,
      };
      const updatedPortfolio = {
        ...mockPortfolio,
        draft_data: expectedMergedData,
      };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);
      vi.mocked(repositories.portfolios.update).mockResolvedValue(updatedPortfolio);

      // Act
      const result = await PortfolioService.updatePortfolio(portfolioId, userId, command);

      // Assert
      expect(result.draft_data).toEqual(expectedMergedData);
      expect(repositories.portfolios.update).toHaveBeenCalledWith(portfolioId, {
        draft_data: expectedMergedData,
      });
    });

    it("should throw PORTFOLIO_NOT_FOUND when portfolio does not exist", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const command: UpdatePortfolioCommand = {
        draft_data: { ...mockPortfolio.draft_data, sections: [] },
      };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(PortfolioService.updatePortfolio(portfolioId, userId, command)).rejects.toThrow(
        new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, "Portfolio not found", {
          portfolioId,
          userId,
        })
      );
      expect(repositories.portfolios.findById).toHaveBeenCalledWith(portfolioId);
      expect(repositories.portfolios.update).not.toHaveBeenCalled();
    });

    it("should throw PORTFOLIO_NOT_FOUND when user does not own portfolio", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const command: UpdatePortfolioCommand = {
        draft_data: { ...mockPortfolio.draft_data, sections: [] },
      };
      const existingPortfolio = { ...mockPortfolio, user_id: "different-user" };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);

      // Act & Assert
      await expect(PortfolioService.updatePortfolio(portfolioId, userId, command)).rejects.toThrow(
        new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, "Portfolio not found or access denied", {
          portfolioId,
          userId,
        })
      );
      expect(repositories.portfolios.findById).toHaveBeenCalledWith(portfolioId);
      expect(repositories.portfolios.update).not.toHaveBeenCalled();
    });

    it("should throw VALIDATION_ERROR when sections limit exceeded", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const sections = Array.from({ length: 11 }, (_, i) => ({
        id: `section-${i}`,
        title: `Section ${i}`,
        slug: `section-${i}`,
        visible: true,
        components: [],
      }));
      const command: UpdatePortfolioCommand = {
        draft_data: {
          bio: mockPortfolio.draft_data.bio,
          sections,
        },
      };
      const existingPortfolio = { ...mockPortfolio };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);

      // Act & Assert
      await expect(PortfolioService.updatePortfolio(portfolioId, userId, command)).rejects.toThrow(
        new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
          userId,
          details: "Maximum 10 sections allowed per portfolio",
        })
      );
      expect(repositories.portfolios.update).not.toHaveBeenCalled();
    });

    it("should throw VALIDATION_ERROR when components limit exceeded", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const components = Array.from({ length: 16 }, (_, i) => ({
        id: `component-${i}`,
        type: "text" as const,
        data: { content: `Content ${i}` },
      }));
      const command: UpdatePortfolioCommand = {
        draft_data: {
          bio: mockPortfolio.draft_data.bio,
          sections: [
            {
              id: "section-1",
              title: "Test Section",
              slug: "test",
              visible: true,
              components,
            },
          ],
        },
      };
      const existingPortfolio = { ...mockPortfolio };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);

      // Act & Assert
      await expect(PortfolioService.updatePortfolio(portfolioId, userId, command)).rejects.toThrow(
        new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
          userId,
          details: "Maximum 15 components allowed per portfolio",
        })
      );
      expect(repositories.portfolios.update).not.toHaveBeenCalled();
    });

    it("should allow maximum valid limits", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const components = Array.from({ length: 15 }, (_, i) => ({
        id: `component-${i}`,
        type: "text" as const,
        data: { content: `Content ${i}` },
      }));
      const sections = Array.from({ length: 10 }, (_, i) => ({
        id: `section-${i}`,
        title: `Section ${i}`,
        slug: `section-${i}`,
        visible: true,
        components: i === 0 ? components : [], // Put all components in first section
      }));
      const command: UpdatePortfolioCommand = {
        draft_data: {
          bio: mockPortfolio.draft_data.bio,
          sections,
        },
      };
      const existingPortfolio = { ...mockPortfolio };
      const updatedPortfolio = {
        ...mockPortfolio,
        draft_data: { ...mockPortfolio.draft_data, ...command.draft_data },
      };

      vi.mocked(repositories.portfolios.findById).mockResolvedValue(existingPortfolio);
      vi.mocked(repositories.portfolios.update).mockResolvedValue(updatedPortfolio);

      // Act
      const result = await PortfolioService.updatePortfolio(portfolioId, userId, command);

      // Assert
      expect(result).toEqual(updatedPortfolio);
      expect(repositories.portfolios.update).toHaveBeenCalledWith(portfolioId, {
        draft_data: command.draft_data,
      });
    });
  });

  describe("publishPortfolio", () => {
    it("should successfully publish portfolio", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const publishedPortfolio = {
        ...mockPublishedPortfolio,
        published_data: mockPortfolio.draft_data,
        last_published_at: "2024-01-02T00:00:00Z",
      };

      vi.mocked(repositories.portfolios.publish).mockResolvedValue(publishedPortfolio);

      // Act
      const result = await PortfolioService.publishPortfolio(portfolioId, userId);

      // Assert
      expect(result).toEqual({
        id: publishedPortfolio.id,
        published_data: publishedPortfolio.published_data,
        last_published_at: publishedPortfolio.last_published_at,
      });
      expect(repositories.portfolios.publish).toHaveBeenCalledWith(portfolioId, userId);
    });

    it("should propagate PORTFOLIO_NOT_FOUND error", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const error = new AppError(ERROR_CODES.PORTFOLIO_NOT_FOUND, "Portfolio not found");

      vi.mocked(repositories.portfolios.publish).mockRejectedValue(error);

      // Act & Assert
      await expect(PortfolioService.publishPortfolio(portfolioId, userId)).rejects.toThrow(error);
      expect(repositories.portfolios.publish).toHaveBeenCalledWith(portfolioId, userId);
    });

    it("should propagate UNMET_REQUIREMENTS error", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const error = new AppError(ERROR_CODES.UNMET_REQUIREMENTS, "Portfolio must have at least 1 section to publish");

      vi.mocked(repositories.portfolios.publish).mockRejectedValue(error);

      // Act & Assert
      await expect(PortfolioService.publishPortfolio(portfolioId, userId)).rejects.toThrow(error);
      expect(repositories.portfolios.publish).toHaveBeenCalledWith(portfolioId, userId);
    });

    it("should propagate DATABASE_ERROR", async () => {
      // Arrange
      const portfolioId = "portfolio-123";
      const userId = "user-123";
      const error = new AppError(ERROR_CODES.DATABASE_ERROR, "Failed to publish portfolio");

      vi.mocked(repositories.portfolios.publish).mockRejectedValue(error);

      // Act & Assert
      await expect(PortfolioService.publishPortfolio(portfolioId, userId)).rejects.toThrow(error);
      expect(repositories.portfolios.publish).toHaveBeenCalledWith(portfolioId, userId);
    });
  });

  describe("getPublicPortfolioByUsername", () => {
    it("should return public portfolio when found and published", async () => {
      // Arrange
      const username = "johndoe";
      const mockSupabaseService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    published_data: mockPublishedPortfolio.published_data,
                    last_published_at: mockPublishedPortfolio.last_published_at,
                    user_profiles: { username },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPublicPortfolioByUsername(mockSupabaseService, username);

      // Assert
      expect(result).toEqual({
        username,
        published_data: mockPublishedPortfolio.published_data,
        last_published_at: mockPublishedPortfolio.last_published_at,
      });
    });

    it("should return null when portfolio not found", async () => {
      // Arrange
      const username = "nonexistent";
      const mockSupabaseService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPublicPortfolioByUsername(mockSupabaseService, username);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when portfolio exists but not published", async () => {
      // Arrange
      const username = "johndoe";
      const mockSupabaseService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPublicPortfolioByUsername(mockSupabaseService, username);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw DATABASE_ERROR for other database errors", async () => {
      // Arrange
      const username = "johndoe";
      const dbError = new Error("Connection failed");
      const mockSupabaseService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: dbError,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act & Assert
      await expect(PortfolioService.getPublicPortfolioByUsername(mockSupabaseService, username)).rejects.toThrow(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          details: { username },
          cause: dbError,
        })
      );
    });

    it("should handle array user_profiles response", async () => {
      // Arrange
      const username = "johndoe";
      const mockSupabaseService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    published_data: mockPublishedPortfolio.published_data,
                    last_published_at: mockPublishedPortfolio.last_published_at,
                    user_profiles: [{ username }],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPublicPortfolioByUsername(mockSupabaseService, username);

      // Assert
      expect(result?.username).toBe(username);
    });
  });

  describe("getPreviewPortfolioByUsername", () => {
    it("should return preview portfolio when user owns it", async () => {
      // Arrange
      const username = "johndoe";
      const userId = "user-123";
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  draft_data: mockPortfolio.draft_data,
                  updated_at: mockPortfolio.updated_at,
                  user_id: userId,
                  user_profiles: { username },
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPreviewPortfolioByUsername(mockSupabase, username, userId);

      // Assert
      expect(result).toEqual({
        username,
        draft_data: mockPortfolio.draft_data,
        updated_at: mockPortfolio.updated_at,
        has_published: false,
        last_published_at: undefined,
      });
    });

    it("should throw UNAUTHORIZED when user does not own portfolio", async () => {
      // Arrange
      const username = "johndoe";
      const userId = "user-123";
      const differentUserId = "different-user";
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  draft_data: mockPortfolio.draft_data,
                  updated_at: mockPortfolio.updated_at,
                  user_id: differentUserId,
                  user_profiles: { username },
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act & Assert
      await expect(PortfolioService.getPreviewPortfolioByUsername(mockSupabase, username, userId)).rejects.toThrow(
        new AppError(ERROR_CODES.UNAUTHORIZED, undefined, {
          userId,
          details: "You can only preview your own portfolio",
        })
      );
    });

    it("should return null when portfolio not found", async () => {
      // Arrange
      const username = "nonexistent";
      const userId = "user-123";
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPreviewPortfolioByUsername(mockSupabase, username, userId);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw DATABASE_ERROR for other database errors", async () => {
      // Arrange
      const username = "johndoe";
      const userId = "user-123";
      const dbError = new Error("Connection failed");
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: dbError,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act & Assert
      await expect(PortfolioService.getPreviewPortfolioByUsername(mockSupabase, username, userId)).rejects.toThrow(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          details: { username },
          cause: dbError,
        })
      );
    });

    it("should handle array user_profiles response", async () => {
      // Arrange
      const username = "johndoe";
      const userId = "user-123";
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  draft_data: mockPortfolio.draft_data,
                  updated_at: mockPortfolio.updated_at,
                  user_id: userId,
                  user_profiles: [{ username }],
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Act
      const result = await PortfolioService.getPreviewPortfolioByUsername(mockSupabase, username, userId);

      // Assert
      expect(result?.username).toBe(username);
    });
  });
});
