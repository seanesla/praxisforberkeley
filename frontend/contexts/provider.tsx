'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface Provider {
  name: 'anthropic';
  isActive: boolean;
  hasApiKey: boolean;
}

interface ProviderContextType {
  activeProvider: string | null;
  providers: Provider[];
  loading: boolean;
  setActiveProvider: (provider: string | null) => Promise<void>;
  refreshProviders: () => Promise<void>;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export function ProviderProvider({ children }: { children: React.ReactNode }) {
  const [activeProvider, setActiveProviderState] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);

  // For now, we'll use a simplified version since we don't have the full API yet
  // This will be expanded when we migrate the API key management features
  const refreshProviders = async () => {
    setProviders([
      { name: 'anthropic', isActive: true, hasApiKey: false },
    ]);
    setActiveProviderState('anthropic');
  };

  const setActiveProvider = async (provider: string | null) => {
    setActiveProviderState(provider);
    // In the future, this will call the API to update the active provider
  };

  useEffect(() => {
    refreshProviders();
  }, []);

  return (
    <ProviderContext.Provider
      value={{
        activeProvider,
        providers,
        loading,
        setActiveProvider,
        refreshProviders,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }
  return context;
}