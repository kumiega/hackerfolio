// Base repository and interfaces
export { BaseRepository, type CrudRepository } from "./base.repository";

// Data access repositories
export { UserProfileRepository } from "./user-profile.repository";
export { PortfolioRepository } from "./portfolio.repository";
export { AppErrorRepository } from "./app-error.repository";

// Service locator for repositories
import type { SupabaseClient } from "@/db/supabase.client";
import { UserProfileRepository } from "./user-profile.repository";
import { PortfolioRepository } from "./portfolio.repository";
import { AppErrorRepository } from "./app-error.repository";

class RepositoryLocator {
  private static instance: RepositoryLocator;
  private supabaseClient: SupabaseClient | null = null;

  private userProfileRepository: UserProfileRepository | null = null;
  private portfolioRepository: PortfolioRepository | null = null;
  private appErrorRepository: AppErrorRepository | null = null;

  static getInstance(): RepositoryLocator {
    if (!RepositoryLocator.instance) {
      RepositoryLocator.instance = new RepositoryLocator();
    }
    return RepositoryLocator.instance;
  }

  initialize(supabaseClient: SupabaseClient): void {
    this.supabaseClient = supabaseClient;
    // Repositories will be created lazily when first accessed
  }

  // Method to get the current supabase client for auth operations
  getSupabaseClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error("RepositoryLocator not initialized with Supabase client");
    }
    return this.supabaseClient;
  }

  get userProfiles(): UserProfileRepository {
    if (!this.userProfileRepository) {
      if (!this.supabaseClient) {
        throw new Error("RepositoryLocator not initialized with Supabase client");
      }
      this.userProfileRepository = new UserProfileRepository(this.supabaseClient);
    }
    return this.userProfileRepository;
  }

  get portfolios(): PortfolioRepository {
    if (!this.portfolioRepository) {
      if (!this.supabaseClient) {
        throw new Error("RepositoryLocator not initialized with Supabase client");
      }
      this.portfolioRepository = new PortfolioRepository(this.supabaseClient);
    }
    return this.portfolioRepository;
  }

  get appErrors(): AppErrorRepository {
    if (!this.appErrorRepository) {
      if (!this.supabaseClient) {
        throw new Error("RepositoryLocator not initialized with Supabase client");
      }
      this.appErrorRepository = new AppErrorRepository(this.supabaseClient);
    }
    return this.appErrorRepository;
  }
}

export const repositories = RepositoryLocator.getInstance();
