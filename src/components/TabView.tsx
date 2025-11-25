import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface TabViewProps {
  path: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * TabView component that manages visibility of tab content
 * All tabs are rendered but only the active one is visible
 */
const TabView: React.FC<TabViewProps> = ({ path, children, className = '' }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewRef.current) {
      if (isActive) {
        // Show with fast fade-in
        requestAnimationFrame(() => {
          if (viewRef.current) {
            viewRef.current.style.display = 'block';
            requestAnimationFrame(() => {
              if (viewRef.current) {
                viewRef.current.style.opacity = '1';
                viewRef.current.style.pointerEvents = 'auto';
              }
            });
          }
        });
      } else {
        // Hide instantly (no transition on hide for instant switching)
        if (viewRef.current) {
          viewRef.current.style.opacity = '0';
          viewRef.current.style.pointerEvents = 'none';
          viewRef.current.style.display = 'none';
        }
      }
    }
  }, [isActive]);

  return (
    <div
      ref={viewRef}
      className={`tab-view ${className}`}
      style={{
        position: isActive ? 'relative' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        minHeight: '100vh',
        opacity: isActive ? 1 : 0,
        transition: isActive ? 'opacity 150ms ease-in' : 'none',
        pointerEvents: isActive ? 'auto' : 'none',
        display: isActive ? 'block' : 'none',
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
        zIndex: isActive ? 1 : 0
      }}
    >
      {children}
    </div>
  );
};

export default TabView;

