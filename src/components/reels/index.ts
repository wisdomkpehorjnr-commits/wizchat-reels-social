// Main component
export { ReelsFeedScreen } from './ReelsFeedScreen';

// Widgets
export { FullscreenVideoPlayer } from './widgets/FullscreenVideoPlayer';
export { ActionBar } from './widgets/ActionBar';
export { VideoInfoSection } from './widgets/VideoInfoSection';
export { CommentsBottomSheet } from './widgets/CommentsBottomSheet';
export { FloatingHearts } from './widgets/FloatingHearts';

// State management
export { ReelsFeedContext, ReelsFeedProvider, useReelsFeed } from './state/ReelsFeedContext';

// Services
export { VideoPlayerController, videoPlayerController } from './services/VideoPlayerController';
export { ReelsApiService, reelsApiService } from './services/ReelsApiService';

// Hooks
export {
  useVideoPlayer,
  useGestureHandler,
  useVideoVisibility,
  useScrollMomentum,
  useHaptic,
  useDebouncedCallback,
  useThrottledCallback,
} from './hooks';

// Types
export * from './types';

// Theme
export { themeManager, type ReelTheme } from './theme';

// Animations
export { animations, transitions, easings } from './animations';

// Utils
export * from './utils';
