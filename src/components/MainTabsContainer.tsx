import { useEffect, useState, Suspense, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTabManager } from '@/contexts/TabManagerContext';
import { useTabPreloader } from '@/hooks/useTabPreloader';
import Home from '@/pages/Home';
import Reels from '@/pages/Reels';
import Chat from '@/pages/Chat';
import Friends from '@/pages/Friends';
import Topics from '@/pages/Topics';

// Skeleton components
const HomeSkeleton = () => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

const ReelsSkeleton = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
  </div>
);

const ChatSkeleton = () => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="h-10 w-full bg-muted animate-pulse rounded-lg mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-12 h-12 bg-muted animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const FriendsSkeleton = () => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="h-10 w-full bg-muted animate-pulse rounded-lg mb-4" />
        <div className="flex gap-2 mb-4">
          {['Friends', 'Requests', 'Sent'].map((tab, i) => (
            <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TopicsSkeleton = () => (
  <div className="container mx-auto px-4 py-6">
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="h-10 w-full bg-muted animate-pulse rounded-lg mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MainTabsContainer: React.FC = () => {
  const location = useLocation();
  const { activeTab, isTabPreloaded, markTabPreloaded } = useTabManager();
  const [tabsReady, setTabsReady] = useState<Set<string>>(new Set(['/'])); // Home is always ready

  const currentPath = location.pathname;
  const isMainTab = ['/', '/reels', '/chat', '/friends', '/topics'].includes(currentPath);

  // Pre-load all tabs on mount
  useEffect(() => {
    const preloadTabs = async () => {
      // Mark all tabs as preloaded (skeleton ready)
      ['/reels', '/chat', '/friends', '/topics'].forEach(tab => {
        markTabPreloaded(tab);
        setTabsReady(prev => new Set(prev).add(tab));
      });
    };

    // Delay preloading slightly to not block initial render
    const timer = setTimeout(preloadTabs, 100);
    return () => clearTimeout(timer);
  }, [markTabPreloaded]);

  // Preload data for each tab
  useTabPreloader('/chat');
  useTabPreloader('/friends');
  useTabPreloader('/reels');
  useTabPreloader('/topics');

  // If not a main tab, this shouldn't be rendered (handled by routing)
  // But just in case, return null
  if (!isMainTab) {
    return null;
  }

  // Render all main tabs, show/hide based on active tab
  // All tabs are pre-rendered but hidden when not active
  return (
    <div className="relative w-full h-full">
      {/* Home Tab */}
      <div
        className={`tab-view transition-opacity duration-150 ${
          currentPath === '/' 
            ? 'opacity-100 relative z-10 pointer-events-auto' 
            : 'opacity-0 absolute inset-0 pointer-events-none z-0'
        }`}
        style={{ 
          visibility: currentPath === '/' ? 'visible' : 'hidden',
          position: currentPath === '/' ? 'relative' : 'absolute'
        }}
      >
        <Home />
      </div>

      {/* Reels Tab */}
      <div
        className={`tab-view transition-opacity duration-150 ${
          currentPath === '/reels' 
            ? 'opacity-100 relative z-10 pointer-events-auto' 
            : 'opacity-0 absolute inset-0 pointer-events-none z-0'
        }`}
        style={{ 
          visibility: currentPath === '/reels' ? 'visible' : 'hidden',
          position: currentPath === '/reels' ? 'relative' : 'absolute'
        }}
      >
        {tabsReady.has('/reels') ? (
          <Suspense fallback={<ReelsSkeleton />}>
            <Reels />
          </Suspense>
        ) : (
          <ReelsSkeleton />
        )}
      </div>

      {/* Chat Tab */}
      <div
        className={`tab-view transition-opacity duration-150 ${
          currentPath === '/chat' 
            ? 'opacity-100 relative z-10 pointer-events-auto' 
            : 'opacity-0 absolute inset-0 pointer-events-none z-0'
        }`}
        style={{ 
          visibility: currentPath === '/chat' ? 'visible' : 'hidden',
          position: currentPath === '/chat' ? 'relative' : 'absolute'
        }}
      >
        {tabsReady.has('/chat') ? (
          <Suspense fallback={<ChatSkeleton />}>
            <Chat />
          </Suspense>
        ) : (
          <ChatSkeleton />
        )}
      </div>

      {/* Friends Tab */}
      <div
        className={`tab-view transition-opacity duration-150 ${
          currentPath === '/friends' 
            ? 'opacity-100 relative z-10 pointer-events-auto' 
            : 'opacity-0 absolute inset-0 pointer-events-none z-0'
        }`}
        style={{ 
          visibility: currentPath === '/friends' ? 'visible' : 'hidden',
          position: currentPath === '/friends' ? 'relative' : 'absolute'
        }}
      >
        {tabsReady.has('/friends') ? (
          <Suspense fallback={<FriendsSkeleton />}>
            <Friends />
          </Suspense>
        ) : (
          <FriendsSkeleton />
        )}
      </div>

      {/* Topics Tab */}
      <div
        className={`tab-view transition-opacity duration-150 ${
          currentPath === '/topics' 
            ? 'opacity-100 relative z-10 pointer-events-auto' 
            : 'opacity-0 absolute inset-0 pointer-events-none z-0'
        }`}
        style={{ 
          visibility: currentPath === '/topics' ? 'visible' : 'hidden',
          position: currentPath === '/topics' ? 'relative' : 'absolute'
        }}
      >
        {tabsReady.has('/topics') ? (
          <Suspense fallback={<TopicsSkeleton />}>
            <Topics />
          </Suspense>
        ) : (
          <TopicsSkeleton />
        )}
      </div>
    </div>
  );
};

export default MainTabsContainer;

