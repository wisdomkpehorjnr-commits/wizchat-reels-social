# TikTok-Style Reels Feed Module

A high-performance, fully-featured TikTok-style vertical video feed component for the WizChat app.

## Features

### 🎬 Core Functionality
- **Fullscreen Video Player**: Gesture-enabled with tap to play/pause, double-tap to like
- **Vertical Snap Scrolling**: Page-based scrolling that snaps to full-screen videos
- **Auto-play/Pause**: Videos auto-play when visible, pause when scrolled away
- **Infinite Scroll**: Automatically loads more reels when approaching the end
- **Video Preloading**: Intelligent preloading of next/previous videos for smooth transitions

### 🎨 UI Components
- **Action Bar**: Like, Comment, Share, Save, Download, Follow buttons with animations
- **Comments Panel**: Bottom sheet with real-time comments and input field
- **Video Info Section**: Username, caption with hashtag/mention highlighting, audio info
- **Floating Hearts**: Double-tap animation with floating hearts
- **Loading States**: Shimmer placeholders and loading indicators

### ⚡ Performance
- **Memory Management**: Keeps only ±1 videos in memory, intelligent cleanup
- **Video Caching**: Pre-caches upcoming videos for instant playback
- **Optimistic UI Updates**: Immediate feedback on user actions
- **Throttled Callbacks**: Smooth scroll and gesture handling without jank
- **Lazy Loading**: Loads comments and data on-demand

### 🎨 Theme & Customization
- **Dark/Light Mode**: Fully theme-aware with dynamic colors
- **Adaptive Gradients**: Theme-based gradients for buttons and overlays
- **Custom Colors**: Easy to customize primary/secondary colors
- **Smooth Transitions**: All interactions have polished animations

### 📱 Gestures & Interactions
- **Vertical Swipe**: Swipe up/down to change videos with momentum
- **Double Tap**: Add floating hearts and like instantly
- **Single Tap**: Pause/play with subtle overlay
- **Haptic Feedback**: Vibration on interactions (where supported)
- **Pull-to-Dismiss**: Comments sheet can be dismissed by dragging

## Project Structure

```
src/components/reels/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript interfaces
├── ReelsFeedScreen.tsx         # Main feed component
├── widgets/
│   ├── FullscreenVideoPlayer.tsx
│   ├── ActionBar.tsx
│   ├── VideoInfoSection.tsx
│   ├── CommentsBottomSheet.tsx
│   └── FloatingHearts.tsx
├── state/
│   └── ReelsFeedContext.tsx    # Feed state management
├── services/
│   ├── VideoPlayerController.ts # Video playback management
│   └── ReelsApiService.ts       # API integration
├── hooks/
│   └── index.ts                # Custom hooks
├── theme/
│   └── index.ts                # Theme definitions
├── animations/
│   └── index.ts                # Animation utilities
└── utils/
    └── index.ts                # Utility functions
```

## Usage

### Basic Integration

```tsx
import { ReelsFeedScreen } from '@/components/reels';

export default function ReelsPage() {
  return <ReelsFeedScreen />;
}
```

### Custom API Integration

Update the `ReelsApiService` to connect to your backend:

```typescript
// src/components/reels/services/ReelsApiService.ts
async fetchReels(page: number = 0): Promise<Reel[]> {
  const response = await fetch(`${this.baseUrl}/reels?page=${page}&limit=${this.pageSize}`);
  // ... implement your API call
}
```

### Theme Customization

```tsx
import { themeManager, ReelTheme } from '@/components/reels';

const customTheme: ReelTheme = {
  isDark: true,
  colors: {
    primary: '#your-primary-color',
    // ... other color properties
  },
  // ... other theme properties
};
```

### Using Individual Components

```tsx
import { 
  FullscreenVideoPlayer, 
  ActionBar, 
  CommentsBottomSheet 
} from '@/components/reels';

// Use components independently
<FullscreenVideoPlayer reel={reel} isActive={true} theme={theme} />
<ActionBar reel={reel} theme={theme} onLike={handleLike} />
```

## Hooks

### `useVideoPlayer`
Manages video playback state and controls.

```tsx
const { isPlaying, currentTime, duration, togglePlayPause, seek } = useVideoPlayer(reel, videoRef);
```

### `useGestureHandler`
Detects tap and double-tap gestures.

```tsx
const { handleTap, doubleTapDetected } = useGestureHandler();
```

### `useVideoVisibility`
Detects when a video enters/leaves viewport.

```tsx
const isVisible = useVideoVisibility(ref);
```

### `useScrollMomentum`
Calculates scroll velocity and momentum.

```tsx
const { updateVelocity, getVelocity, resetVelocity } = useScrollMomentum();
```

### `useHaptic`
Triggers haptic feedback.

```tsx
const { triggerHaptic } = useHaptic();
triggerHaptic('medium'); // 'light' | 'medium' | 'heavy'
```

## State Management

The feed uses React Context for state management:

```tsx
const { state, actions } = useReelsFeed();

// State
state.reels              // Current reels
state.currentIndex       // Currently viewing index
state.likedReelIds       // Set of liked reel IDs
state.savedReelIds       // Set of saved reel IDs
state.followedUserIds    // Set of followed user IDs

// Actions
actions.toggleLike(reelId)
actions.toggleSave(reelId)
actions.toggleFollow(userId)
actions.setCurrentIndex(index)
actions.addReels(newReels)
```

## API Service

### Methods

```typescript
// Fetching
fetchReels(page)              // Get paginated reels
fetchComments(reelId, page)   // Get comments for a reel

// Interactions
likeReel(reelId)              // Like a reel
unlikeReel(reelId)            // Unlike a reel
saveReel(reelId)              // Save a reel
unsaveReel(reelId)            // Unsave a reel

// Social
followUser(userId)            // Follow a user
unfollowUser(userId)          // Unfollow a user
postComment(reelId, text)     // Post a comment
likeComment(commentId)        // Like a comment

// Utilities
downloadVideo(reel)           // Download video
shareReel(reel)               // Share video
```

## Video Player Controller

Low-level video management:

```typescript
import { videoPlayerController } from '@/components/reels';

// Initialize
await videoPlayerController.initializePlayer(reel, videoElement);

// Playback control
await videoPlayerController.playReel(reelId);
await videoPlayerController.pauseReel(reelId);
await videoPlayerController.togglePlayPause(reelId);

// Seeking
videoPlayerController.seekTo(reelId, time);

// Cleanup
videoPlayerController.disposePlayer(reelId);
videoPlayerController.disposeAll();
```

## Performance Tips

1. **Lazy Load Comments**: Comments load on-demand when sheet opens
2. **Memory Management**: Controller automatically cleans up far-away videos
3. **Throttled Scrolling**: Scroll events are throttled for smooth performance
4. **Video Preloading**: Next/previous videos preload automatically
5. **Haptic Feedback**: Use sparingly to avoid battery drain

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Chrome Android

## Known Limitations

1. **Autoplay**: Some browsers restrict video autoplay; users may need to tap to play
2. **Fullscreen**: Native fullscreen requires user gesture on some browsers
3. **Video Formats**: Ensure MP4 H.264 codec for maximum compatibility
4. **Network**: Preloading disabled on slow 2G networks

## Future Enhancements

- [ ] Recorded metrics dashboard
- [ ] A/B testing framework
- [ ] Advanced comment threading
- [ ] Multi-language support
- [ ] Live streaming integration
- [ ] Video recording tools

## Contributing

When adding new features:
1. Keep components modular and focused
2. Update types in `types.ts`
3. Add animations in `animations/index.ts`
4. Use theme utilities for styling
5. Test on mobile devices

## Support

For issues or questions, check:
- Type definitions in `types.ts`
- Hook implementations in `hooks/index.ts`
- Theme system in `theme/index.ts`
