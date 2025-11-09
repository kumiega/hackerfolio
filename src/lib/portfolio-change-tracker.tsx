"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import type { PortfolioData } from "@/types";

interface PortfolioState {
  data: PortfolioData | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
}

interface PortfolioChangeTrackerContextType {
  // State
  portfolioState: PortfolioState;

  // Actions
  markAsChanged: () => void;
  markAsSaved: (savedData: PortfolioData) => void;
  markAsPublished: (publishedAt: string) => void;
  resetChanges: () => void;
  setInitialState: (data: PortfolioData, lastSavedAt?: string, lastPublishedAt?: string) => void;

  // Save functions refs (for header to call)
  saveBioRef: React.MutableRefObject<(() => void) | null>;
  saveSectionsRef: React.MutableRefObject<(() => void) | null>;
  publishRef: React.MutableRefObject<(() => void) | null>;

  // Loading states
  isSaving: boolean;
  isPublishing: boolean;
  setSaving: (saving: boolean) => void;
  setPublishing: (publishing: boolean) => void;
}

const PortfolioChangeTrackerContext = createContext<PortfolioChangeTrackerContextType | null>(null);

export function usePortfolioChangeTracker() {
  const context = useContext(PortfolioChangeTrackerContext);
  if (!context) {
    throw new Error("usePortfolioChangeTracker must be used within PortfolioChangeTrackerProvider");
  }
  return context;
}

interface PortfolioChangeTrackerProviderProps {
  children: ReactNode;
}

export function PortfolioChangeTrackerProvider({ children }: PortfolioChangeTrackerProviderProps) {
  const [portfolioState, setPortfolioState] = useState<PortfolioState>({
    data: null,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    lastPublishedAt: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Refs for save/publish functions
  const saveBioRef = useRef<(() => void) | null>(null);
  const saveSectionsRef = useRef<(() => void) | null>(null);
  const publishRef = useRef<(() => void) | null>(null);

  const markAsChanged = useCallback(() => {
    setPortfolioState((prev) => ({
      ...prev,
      hasUnsavedChanges: true,
    }));
  }, []);

  const markAsSaved = useCallback((savedData: PortfolioData) => {
    setPortfolioState((prev) => ({
      ...prev,
      data: savedData,
      hasUnsavedChanges: false,
      lastSavedAt: new Date().toISOString(),
    }));
  }, []);

  const markAsPublished = useCallback((publishedAt: string) => {
    setPortfolioState((prev) => ({
      ...prev,
      hasUnsavedChanges: false,
      lastPublishedAt: publishedAt,
    }));
  }, []);

  const resetChanges = useCallback(() => {
    setPortfolioState((prev) => ({
      ...prev,
      hasUnsavedChanges: false,
    }));
  }, []);

  const setInitialState = useCallback((data: PortfolioData, lastSavedAt?: string, lastPublishedAt?: string) => {
    setPortfolioState({
      data,
      hasUnsavedChanges: false,
      lastSavedAt: lastSavedAt || null,
      lastPublishedAt: lastPublishedAt || null,
    });
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    setIsSaving(saving);
  }, []);

  const setPublishing = useCallback((publishing: boolean) => {
    setIsPublishing(publishing);
  }, []);

  const contextValue: PortfolioChangeTrackerContextType = {
    portfolioState,
    markAsChanged,
    markAsSaved,
    markAsPublished,
    resetChanges,
    setInitialState,
    saveBioRef,
    saveSectionsRef,
    publishRef,
    isSaving,
    isPublishing,
    setSaving,
    setPublishing,
  };

  return (
    <PortfolioChangeTrackerContext.Provider value={contextValue}>{children}</PortfolioChangeTrackerContext.Provider>
  );
}
