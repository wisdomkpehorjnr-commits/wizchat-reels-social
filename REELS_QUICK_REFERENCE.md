# Reels Feed - Quick Reference Card

A handy reference for developers working with the TikTok-style Reels feed.

## 📦 Import Quick Reference

```typescript
// Main component
import { ReelsFeedScreen } from '@/components/reels';

// Individual widgets
import { 
  FullscreenVideoPlayer,
  ActionBar,
  VideoInfoSection,
  CommentsBottomSheet,
  FloatingHearts
} from '@/components/reels';

// State management
import { ReelsFeedProvider, useReelsFeed } from '@/components/reels';

// Services
import { videoPlayerController } from '@/components/reels';
import { reelsApiService } from '@/components/reels';

// Hooks
import { 
  useVideoPlayer,
  useGestureHandler,
  useVideoVisibility,
  useScrollMomentum,
  useHaptic,
  useDebouncedCallback,
  useThrottledCallback
} from '@/components/reels';

// Types
import { 
  Reel,
  Comment,
  ReelFeedState,
  VideoPlayerState,
  GestureState,
  CommentSheetState
} from '@/components/reels';

// Theme
import { themeManager, type ReelTheme } from '@/components/reels';

// Utilities
import { 
  formatNumber,
  formatTimeAgo,
  formatDuration,
  extractHashtags,
  extractMentions,
  highlightHashtagsAndMentions
} from '@/components/reels';

// Animations
import { animations, transitions, easings } from '@/components/reels';
```

## 🎯 Common Use Cases

### Show Reels Feed
```tsx
<ReelsFeedScreen />
```

### Access Feed State
```tsx
const { state, actions } = useReelsFeed();

// State
console.log(state.reels);           // Reel[]
console.log(state.currentIndex);    // number
console.log(state.likedReelIds);    // Set<string>
console.log(state.isLoading);       // boolean

// Actions
actions.toggleLike(reelId);
actions.toggleSave(reelId);
actions.toggleFollow(userId);
actions.setCurrentIndex(index);
```

### Manual Video Control
```tsx
const videoRef = useRef<HTMLVideoElement>(null);
const { isPlaying, togglePlayPause, seek } = useVideoPlayer(reel, videoRef);

await togglePlayPause();
seek(30); // Seek to 30 seconds
```

### Detect Gestures
```tsx
const { handleTap, doubleTapDetected } = useGestureHandler();

handleTap(() => {
  console.log('Double tapped!');
});
```

### Trigger Haptic Feedback
```tsx
const { triggerHaptic } = useHaptic();

triggerHaptic('light');    // Light vibration
triggerHaptic('medium');   // Medium vibration
triggerHaptic('heavy');    // Heavy vibration
```

### Format Numbers & Time
```tsx
formatNumber(1234567);         // "1.2M"
formatTimeAgo("2024-01-20");   // "4d"
formatDuration(125);           // "2:05"
```

### Theme Styling
```tsx
import { themeManager } from '@/components/reels';

const isDark = true;
const theme = themeManager.getTheme(isDark);

// Access colors
const primary = theme.colors.primary;
const surface = theme.colors.surface;

// Access gradients
const gradient = theme.gradients.actionBarBg;

// Access shadows
const shadow = theme.shadows.lg;
```

## ⚙️ Configuration

### Video Player Settings
```typescript
// src/components/reels/services/VideoPlayerController.ts
private maxCachedPlayers = 3;        // Videos to keep loaded
private preloadBuffer = 1;           // Preload ±N videos
private cacheTimeout = 5 * 60 * 1000; // 5 minutes
private maxCacheSize = 500 * 1024 * 1024; // 500MB
```

### Scroll Behavior
```typescript
// src/components/reels/ReelsFeedScreen.tsx
const handleScroll = useThrottledCallback(() => {
  // ...
}, 300); // Throttle delay in ms
```

### Gesture Detection
```typescript
// src/components/reels/hooks/index.ts
const handleTap = useCallback((callback: () => void) => {
  // ...
  if (timeSinceLast < 300) {  // Double-tap threshold
    callback();
  }
}, []);
```

### API Pagination
```typescript
// src/components/reels/services/ReelsApiService.ts
private pageSize = 10;  // Reels per request
// Comment pagination uses 20 per page
```

## 🔧 Key Methods

### VideoPlayerController
```typescript
// Initialize
await videoPlayerController.initializePlayer(reel, videoElement);

// Control playback
await videoPlayerController.playReel(reelId);
await videoPlayerController.pauseReel(reelId);
await videoPlayerController.togglePlayPause(reelId);
videoPlayerController.seekTo(reelId, time);

// Get state
const state = videoPlayerController.getPlaybackState(reelId);
videoPlayerController.updatePlaybackState(reelId);

// Manage resources
videoPlayerController.preloadVideo(videoUrl);
videoPlayerController.disposePlayer(reelId);
videoPlayerController.disposeAll();
videoPlayerController.getStats();
```

### ReelsApiService
```typescript
// Fetch
await reelsApiService.fetchReels(page);
await reelsApiService.fetchComments(reelId, page);

// Interactions
await reelsApiService.likeReel(reelId);
await reelsApiService.unlikeReel(reelId);
await reelsApiService.saveReel(reelId);
await reelsApiService.unsaveReel(reelId);

// Social
await reelsApiService.followUser(userId);
await reelsApiService.unfollowUser(userId);
await reelsApiService.postComment(reelId, text);
await reelsApiService.likeComment(commentId);

// Utilities
await reelsApiService.downloadVideo(reel);
await reelsApiService.shareReel(reel);
reelsApiService.clearCache();
```

### useReelsFeed
```typescript
const { state, actions } = useReelsFeed();

// Mutations
actions.addReels(reels);
actions.setCurrentIndex(index);
actions.toggleLike(reelId);
actions.toggleSave(reelId);
actions.toggleFollow(userId);
actions.setLoading(boolean);
actions.setError(error);
actions.setHasMore(boolean);
actions.reset();
```

## 📊 Type Reference

### Reel
```typescript
interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  isFollowing?: boolean;
  caption: string;
  hashtags: string[];
  audioInfo?: {
    title: string;
    artist: string;
    iconUrl?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  duration?: number;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  reelId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}
```

### ReelTheme
```typescript
interface ReelTheme {
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    overlay: string;
    overlayStrong: string;
  };
  gradients: {
    actionBarBg: string;
    actionBarBgLight: string;
    overlayGradient: string;
    shimmerGradient: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
```

## 🎬 Animation Classes

```typescript
import { animations } from '@/components/reels';

// Apply animations via className or inline
animations.floatingHeart   // Heart float-up animation
animations.buttonBounce    // Button scale bounce
animations.ripple          // Ripple effect
animations.shimmer         // Shimmer loading
animations.fadeIn          // Fade in
animations.fadeOut         // Fade out
animations.slideUp         // Slide up (bottom sheet)
animations.slideDown       // Slide down (bottom sheet)
animations.marquee         // Marquee scrolling text
animations.pulse           // Pulse highlight
```

## 🎨 Color Utilities

```typescript
import { 
  getThemeColor,
  getThemeGradient,
  getThemeShadow,
  getButtonStyles,
  getIconColor,
  getTextColor
} from '@/components/reels';

const primaryColor = getThemeColor(theme, 'primary');
const gradient = getThemeGradient(theme, 'actionBarBg');
const shadow = getThemeShadow(theme, 'lg');

const buttonStyle = getButtonStyles(theme, 'primary'); // 'primary' | 'secondary' | 'ghost'
const iconColor = getIconColor(theme, true);  // true = active
const textColor = getTextColor(theme, 'primary'); // 'primary' | 'secondary' | 'tertiary'
```

## 📱 Responsive Design

The feed is fully responsive:
- **Mobile**: Full viewport width/height
- **Tablet**: Full viewport width/height
- **Desktop**: Full viewport width/height

All components use relative sizing and percentages.

## 🔍 Debugging

### Check Video Player Stats
```typescript
const stats = videoPlayerController.getStats();
console.log(stats);
// {
//   activePlayersCount: 3,
//   cachedVideosCount: 2,
//   cacheSize: '45.23MB',
//   currentReelId: 'reel-123'
// }
```

### Monitor Feed State
```typescript
const { state } = useReelsFeed();
console.log('Current reel:', state.reels[state.currentIndex]);
console.log('Liked reels:', Array.from(state.likedReelIds));
console.log('Loading:', state.isLoading);
```

### Check Browser DevTools
1. **Performance**: Record scroll interactions
2. **Memory**: Take heap snapshots
3. **Network**: Monitor video downloads
4. **Console**: Check for errors

## ⚡ Performance Tips

1. Keep video resolution at 720p or lower
2. Use `useThrottledCallback` for scroll/resize
3. Enable hardware acceleration in browser
4. Monitor cache size with `getStats()`
5. Test on actual mobile devices
6. Use Chrome DevTools Performance tab
7. Check for Memory leaks regularly

## 🚀 Deployment Checklist

- [ ] Update `VITE_API_URL` in `.env`
- [ ] Test all API endpoints
- [ ] Verify video URLs are accessible
- [ ] Check CORS headers
- [ ] Test theme switching
- [ ] Test on mobile devices
- [ ] Verify touch gestures work
- [ ] Test slow network (3G throttle)
- [ ] Check console for errors
- [ ] Enable error tracking/logging
- [ ] Monitor performance metrics

## 📚 Resources

- **README**: `src/components/reels/README.md`
- **Implementation Guide**: `REELS_IMPLEMENTATION_GUIDE.md`
- **Migration Guide**: `REELS_MIGRATION_GUIDE.md`
- **Build Summary**: `REELS_BUILD_SUMMARY.md`

## 💡 Pro Tips

1. **Use feature flags** for gradual rollout
2. **Monitor memory** on low-end devices
3. **Test animations** on real devices (60fps varies)
4. **Leverage preloading** for smooth transitions
5. **Cache comments** for fast reopens
6. **Use optimistic updates** for instant feedback
7. **Respect user's connection** - don't preload on 2G
8. **Leverage theme system** - don't hardcode colors
9. **Test keyboard navigation** - important for accessibility
10. **Monitor network requests** - ensure efficient batching

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Videos not playing | Check video URL, CORS headers, browser autoplay policy |
| Scroll stutters | Reduce cache players from 3 to 2, check video resolution |
| Memory grows | Monitor with DevTools, check for resource leaks, restart browser |
| Comments not loading | Verify API endpoint, check authentication, review network tab |
| Theme not switching | Check ThemeContext provider, clear localStorage |
| Gestures not working | Verify touch events, check event listeners, test on device |

---

**Last Updated**: November 25, 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
