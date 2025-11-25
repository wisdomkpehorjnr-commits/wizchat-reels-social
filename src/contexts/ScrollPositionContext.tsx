import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPositionState {
  [path: string]: {
    scrollY: number;
    posts?: any[];
    timestamp?: number;
  };
}

interface ScrollPositionContextType {
  saveScrollPosition: (path: string, scrollY: number, data?: any) => void;
  getScrollPosition: (path: string) => number | null;
  getCachedData: (path: string) => any | null;
  clearScrollPosition: (path: string) => void;
  clearAll: () => void;
}

const ScrollPositionContext = createContext<ScrollPositionContextType | undefined>(undefined);

export const ScrollPositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState<ScrollPositionState>({});
  const location = useLocation();
  const previousPathRef = useRef<string>('');

  // Save scroll position when path changes (user navigates away)
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    // If we're navigating away from a page, save its scroll position
    if (previousPath && previousPath !== currentPath) {
      const scrollY = window.scrollY;
      setScrollPositions(prev => ({
        ...prev,
        [previousPath]: {
          ...prev[previousPath],
          scrollY,
          timestamp: Date.now()
        }
      }));
    }

    previousPathRef.current = currentPath;
  }, [location.pathname]);

  // Save scroll position on scroll (throttled)
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentPath = location.pathname;
          const scrollY = window.scrollY;
          
          setScrollPositions(prev => ({
            ...prev,
            [currentPath]: {
              ...prev[currentPath],
              scrollY,
              timestamp: Date.now()
            }
          }));
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  const saveScrollPosition = (path: string, scrollY: number, data?: any) => {
    setScrollPositions(prev => ({
      ...prev,
      [path]: {
        scrollY,
        posts: data,
        timestamp: Date.now()
      }
    }));
  };

  const getScrollPosition = (path: string): number | null => {
    return scrollPositions[path]?.scrollY ?? null;
  };

  const getCachedData = (path: string): any | null => {
    return scrollPositions[path]?.posts ?? null;
  };

  const clearScrollPosition = (path: string) => {
    setScrollPositions(prev => {
      const newState = { ...prev };
      delete newState[path];
      return newState;
    });
  };

  const clearAll = () => {
    setScrollPositions({});
  };

  return (
    <ScrollPositionContext.Provider
      value={{
        saveScrollPosition,
        getScrollPosition,
        getCachedData,
        clearScrollPosition,
        clearAll
      }}
    >
      {children}
    </ScrollPositionContext.Provider>
  );
};

export const useScrollPosition = () => {
  const context = useContext(ScrollPositionContext);
  if (context === undefined) {
    throw new Error('useScrollPosition must be used within a ScrollPositionProvider');
  }
  return context;
};

