/**
 * Performance & Caching Exports
 * Central import point for all performance-related utilities
 */

// Services
export { cacheService } from '@/services/cacheService';
export { networkStatusManager, type ConnectionStatus, type ConnectionSpeed } from '@/services/networkStatusManager';
export { tabPreloadManager } from '@/services/tabPreloadManager';


// Performance utilities
export {
  requestManager,
  debounce,
  throttle,
  memoize,
  retryWithBackoff,
} from '@/lib/performanceUtils';

// Hooks
export { useTabCache, useTabPrefetch, useTabTransition } from '@/hooks/useTabCache';
export { useNetworkStatus, useSmartCache } from '@/hooks/useNetworkAware';

// Components
export {
  PostCardSkeleton,
  ReelCardSkeleton,
  CommentSkeleton,
  PulsatingDots,
  ListSkeleton,
  FeedSkeleton,
  ProfileSectionSkeleton,
  SkeletonLoader,
} from '@/components/SkeletonLoaders';

export {
  NetworkStatusBanner,
  NetworkStatusIndicator,
} from '@/components/NetworkStatusBanner';

export {
  SmartLoading,
  PaginationLoading,
  StaleWhileRevalidate,
  ContentFadeIn,
  RefreshButton,
  CachedBadge,
} from '@/components/SmartLoading';
