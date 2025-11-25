import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface TabCache {
  [key: string]: {
    data: any;
    skeleton: boolean;
    timestamp: number;
    loading: boolean;
  };
}

interface TabManagerContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getCachedData: (tab: string) => any | null;
  setCachedData: (tab: string, data: any) => void;
  isTabPreloaded: (tab: string) => boolean;
  markTabPreloaded: (tab: string) => void;
  isTabLoading: (tab: string) => boolean;
  setTabLoading: (tab: string, loading: boolean) => void;
}

const TabManagerContext = createContext<TabManagerContextType | undefined>(undefined);

export const TabManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [activeTab, setActiveTabState] = useState<string>(location.pathname);
  const [tabCache, setTabCache] = useState<TabCache>({});
  const [preloadedTabs, setPreloadedTabs] = useState<Set<string>>(new Set());
  const loadingTabs = useRef<Set<string>>(new Set());

  // Update active tab when route changes
  useEffect(() => {
    const path = location.pathname;
    const mainTabs = ['/', '/reels', '/chat', '/friends', '/topics'];
    
    if (mainTabs.includes(path)) {
      setActiveTabState(path);
    }
  }, [location.pathname]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
  }, []);

  const getCachedData = useCallback((tab: string): any | null => {
    return tabCache[tab]?.data || null;
  }, [tabCache]);

  const setCachedData = useCallback((tab: string, data: any) => {
    setTabCache(prev => ({
      ...prev,
      [tab]: {
        data,
        skeleton: false,
        timestamp: Date.now(),
        loading: false
      }
    }));
  }, []);

  const isTabPreloaded = useCallback((tab: string): boolean => {
    return preloadedTabs.has(tab);
  }, [preloadedTabs]);

  const markTabPreloaded = useCallback((tab: string) => {
    setPreloadedTabs(prev => new Set(prev).add(tab));
  }, []);

  const isTabLoading = useCallback((tab: string): boolean => {
    return loadingTabs.current.has(tab);
  }, []);

  const setTabLoading = useCallback((tab: string, loading: boolean) => {
    if (loading) {
      loadingTabs.current.add(tab);
    } else {
      loadingTabs.current.delete(tab);
    }
    // Force re-render
    setTabCache(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        loading
      }
    }));
  }, []);

  return (
    <TabManagerContext.Provider
      value={{
        activeTab,
        setActiveTab,
        getCachedData,
        setCachedData,
        isTabPreloaded,
        markTabPreloaded,
        isTabLoading,
        setTabLoading
      }}
    >
      {children}
    </TabManagerContext.Provider>
  );
};

export const useTabManager = () => {
  const context = useContext(TabManagerContext);
  if (context === undefined) {
    throw new Error('useTabManager must be used within a TabManagerProvider');
  }
  return context;
};

