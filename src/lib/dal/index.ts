/**
 * Data Access Layer (DAL) - Lightweight abstraction for view data access
 *
 * This layer provides simple, view-focused data access methods without business logic.
 * All methods are designed to be used directly in Astro pages and components.
 *
 * Key principles:
 * - No business logic - only data retrieval and simple transformations
 * - View-focused - methods return exactly what views need
 * - Consistent error handling
 * - Type-safe operations
 */

// Export all DAL functions from individual modules
export * from "./user";
export * from "./portfolio";
export * from "./auth";
export * from "./types";
