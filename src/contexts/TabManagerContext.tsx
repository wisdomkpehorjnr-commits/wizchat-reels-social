import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface TabCache {
  [path: string]: {
    data: any;
    timestamp: number;
    skeleton?: ReactNode;
  };
}

interface TabManagerContextType {
  activeTab: string;
  setActiveTab: (path: string) => void;
  preloadTab: (path: string, data?: any) => void;
  getCachedData: (path: string) => any | null;
  setCachedData: (path: string, data: any) => void;
  isTabPreloaded: (path: string) => boolean;
  tabs: Set<string>;
}

const TabManagerContext = createContext<TabManagerContextType | undefined>(undefined);

export const TabManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTabState] = useState<string>(location.pathname);
  const [tabCache, setTabCache] = useState<TabCache>({});
  const [preloadedTabs, setPreloadedTabs] = useState<Set<string>>(new Set());
  const tabsRef = useRef<Set<string>>(new Set(['/', '/reels', '/chat', '/friends', '/topics']));

  // Sync active tab with location
  useEffect(() => {
    setActiveTabState(location.pathname);
  }, [location.pathname]);

  const setActiveTab = (path: string) => {
    if (path !== location.pathname) {
      navigate(path);
    }
    setActiveTabState(path);
  };

  const preloadTab = (path: string, data?: any) => {
    if (preloadedTabs.has(path)) return;

    setTabCache(prev => ({
      ...prev,
      [path]: {
        data: data || null,
        timestamp: Date.now()
      }
    }));

    setPreloadedTabs(prev => new Set(prev).add(path));
  };

  const getCachedData = (path: string): any | null => {
    const cached = tabCache[path];
    if (!cached) return null;
    
    // Cache valid for 5 minutes
    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > 5 * 60 * 1000) {
      return null;
    }
    
    return cached.data;
  };

  const setCachedData = (path: string, data: any) => {
    setTabCache(prev => ({
      ...prev,
      [path]: {
        data,
        timestamp: Date.now()
      }
    }));
  };

  const isTabPreloaded = (path: string): boolean => {
    return preloadedTabs.has(path);
  };

  // Preload all tabs on mount
  useEffect(() => {
    // Mark all tabs as preloaded (they'll render but be hidden)
    tabsRef.current.forEach(tab => {
      if (tab !== location.pathname) {
        preloadTab(tab);
      }
    });
  }, []);

  return (
    <TabManagerContext.Provider
      value={{
        activeTab,
        setActiveTab,
        preloadTab,
        getCachedData,
        setCachedData,
        isTabPreloaded,
        tabs: tabsRef.current
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

