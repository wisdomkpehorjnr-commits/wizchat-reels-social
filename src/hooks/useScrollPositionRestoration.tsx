/**
 * Hook for managing scroll position persistence across tab switches
 * Saves scroll position to localStorage and restores it on mount
 */
import { useLayoutEffect, useRef } from 'react';

interface ScrollPositionOptions {
  storageKey: string;
  enabled?: boolean;
}

export function useScrollPositionRestoration({ storageKey, enabled = true }: ScrollPositionOptions) {
  const scrollRestoredRef = useRef(false);
  const isRestoringRef = useRef(false);

  // Restore scroll position immediately on mount (before paint)
  useLayoutEffect(() => {
    if (!enabled || scrollRestoredRef.current) return;

    scrollRestoredRef.current = true;
    isRestoringRef.current = true;

    try {
      const savedPosition = localStorage.getItem(storageKey);
      if (savedPosition) {
        const scrollY = parseInt(savedPosition, 10);
        if (!isNaN(scrollY) && scrollY > 0) {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
            console.debug('[ScrollRestore] Restored scroll position:', scrollY);

            // Verify the position was set, try again if needed
            requestAnimationFrame(() => {
              if (window.scrollY !== scrollY) {
                window.scrollTo(0, scrollY);
              }
              isRestoringRef.current = false;
            });
          });
        } else {
          isRestoringRef.current = false;
        }
      } else {
        isRestoringRef.current = false;
      }
    } catch (e) {
      console.debug('[ScrollRestore] Failed to restore scroll:', e);
      isRestoringRef.current = false;
    }
  }, [enabled, storageKey]);

  // Track scroll position
  useLayoutEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      // Don't save while restoring
      if (isRestoringRef.current) return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(window.scrollY));
      } catch (e) {
        console.debug('[ScrollRestore] Failed to save scroll position:', e);
      }
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, storageKey]);

  return {
    isRestoring: isRestoringRef.current,
    clearScroll: () => {
      try {
        localStorage.removeItem(storageKey);
        scrollRestoredRef.current = false;
      } catch (e) {
        console.debug('[ScrollRestore] Failed to clear scroll:', e);
      }
    },
  };
}

/**
 * Hook for managing scroll position within a scrollable container
 * Useful for virtual lists and scroll containers
 */
export function useScrollPositionRestorationForContainer(
  containerRef: React.RefObject<HTMLElement>,
  storageKey: string,
  enabled = true
) {
  const scrollRestoredRef = useRef(false);
  const isRestoringRef = useRef(false);

  // Restore scroll position
  useLayoutEffect(() => {
    if (!enabled || !containerRef.current || scrollRestoredRef.current) return;

    scrollRestoredRef.current = true;
    isRestoringRef.current = true;

    try {
      const savedPosition = localStorage.getItem(storageKey);
      if (savedPosition) {
        const scrollY = parseInt(savedPosition, 10);
        if (!isNaN(scrollY) && scrollY > 0) {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = scrollY;
              console.debug('[ScrollRestore] Container scroll restored:', scrollY);
            }
            isRestoringRef.current = false;
          });
        } else {
          isRestoringRef.current = false;
        }
      } else {
        isRestoringRef.current = false;
      }
    } catch (e) {
      console.debug('[ScrollRestore] Failed to restore container scroll:', e);
      isRestoringRef.current = false;
    }
  }, [enabled, containerRef, storageKey]);

  // Track scroll position
  useLayoutEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(container.scrollTop));
      } catch (e) {
        console.debug('[ScrollRestore] Failed to save container scroll:', e);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, containerRef, storageKey]);

  return {
    isRestoring: isRestoringRef.current,
    clearScroll: () => {
      try {
        localStorage.removeItem(storageKey);
        scrollRestoredRef.current = false;
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      } catch (e) {
        console.debug('[ScrollRestore] Failed to clear container scroll:', e);
      }
    },
  };
}
