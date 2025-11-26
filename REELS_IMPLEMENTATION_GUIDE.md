# TikTok-Style Reels Implementation Guide

This document provides a comprehensive guide to implementing and customizing the TikTok-style vertical video feed for WizChat.

## Quick Start

### 1. Basic Setup

The ReelsFeedScreen is the main component that handles everything:

```tsx
// src/pages/Reels.tsx
import { ReelsFeedScreen } from '@/components/reels';

export default function ReelsPage() {
  return <ReelsFeedScreen />;
}
```

### 2. Connect to Your API

Update `src/components/reels/services/ReelsApiService.ts` to connect to your backend:

```typescript
async fetchReels(page: number = 0): Promise<Reel[]> {
  const response = await fetch(`https://your-api.com/api/reels?page=${page}&limit=${this.pageSize}`);
  const data = await response.json();
  return data.reels;
}

async postComment(reelId: string, text: string): Promise<Comment | null> {
  const response = await fetch(`https://your-api.com/api/reels/${reelId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await response.json();
  return data.comment;
}
```

### 3. Environment Configuration

Add API URL to your `.env` file:

```env
VITE_API_URL=https://api.yourdomain.com/api
```

## Architecture Overview

### Component Hierarchy

```
ReelsFeedScreen (Main Container)
├── Theme Provider & Context
├── Reels Feed Container (Scroll Container)
│   ├── FullscreenVideoPlayer (For each reel)
│   │   ├── Video Element
│   │   ├── FloatingHearts (Double-tap animation)
│   │   └── Play/Pause Overlay
│   ├── ActionBar (Right side)
│   │   ├── Like Button
│   │   ├── Comment Button
│   │   ├── Share Button
│   │   ├── Save Button
│   │   ├── Download Button
│   │   └── Follow Button
│   └── VideoInfoSection (Bottom overlay)
│       ├── Audio Info
│       ├── User Info
│       ├── Caption
│       └── Hashtags
└── CommentsBottomSheet (Modal)
    ├── Comment List
    └── Comment Input
```

### Data Flow

```
[API Service] 
    ↓
[Fetch Reels/Comments]
    ↓
[ReelsFeedContext] (State Management)
    ↓
[useReelsFeed Hook]
    ↓
[Components] (Update UI)
    ↓
[User Interactions] (Like, Comment, Follow)
    ↓
[API Service] (Send to backend)
    ↓
[Optimistic UI Update] (Instant feedback)
```

## Customization Guide

### 1. Styling & Theme

Customize colors in `src/components/reels/theme/index.ts`:

```typescript
const darkTheme: ReelTheme = {
  isDark: true,
  colors: {
    primary: '#ff006e',           // Primary accent color
    secondary: '#8338ec',         // Secondary accent
    background: '#0a0e27',        // Page background
    surface: '#1a1f3a',           // Card/surface background
    surfaceVariant: '#2a2f4a',    // Lighter surface
    text: '#ffffff',              // Primary text
    textSecondary: '#e0e0e0',     // Secondary text
    textTertiary: '#a0a0a0',      // Tertiary text
    border: '#3a3f4a',            // Border color
    // ... other colors
  },
  gradients: {
    actionBarBg: 'linear-gradient(...)',
    overlayGradient: 'linear-gradient(...)',
    // ... other gradients
  },
  // ... shadows
};
```

### 2. Video Player Behavior

Customize video preloading and caching in `VideoPlayerController.ts`:

```typescript
private maxCachedPlayers = 3;      // How many videos to keep loaded
private preloadBuffer = 1;         // Preload ±N videos
private cacheTimeout = 5 * 60 * 1000;  // Cache duration
private maxCacheSize = 500 * 1024 * 1024;  // Max cache size (500MB)
```

### 3. Scroll Behavior

Modify scroll settings in `ReelsFeedScreen.tsx`:

```typescript
const handleScroll = useThrottledCallback(() => {
  // ... scroll logic
}, 300);  // Throttle delay in ms

// Snap scrolling configuration
<div
  style={{
    scrollSnapType: 'y mandatory',  // Change to 'y proximity' for looser snapping
    scrollBehavior: 'smooth',
  }}
>
```

### 4. API Configuration

Extend `ReelsApiService` with custom behavior:

```typescript
export class ReelsApiService {
  private baseUrl = import.meta.env.VITE_API_URL || '/api';
  private pageSize = 10;  // Change to adjust items per page
  
  async fetchReels(page: number = 0): Promise<Reel[]> {
    // Custom implementation
  }
}
```

### 5. Animations

Customize animations in `src/components/reels/animations/index.ts`:

```typescript
export const floatingHeartKeyframes = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100px) scale(0.8);  // Adjust trajectory
  }
`;
```

## Advanced Features

### Auto-play Management

Videos automatically play when:
- Component becomes visible (70% threshold)
- User scrolls to it
- Previous video is paused

Customize in `ReelsFeedScreen.tsx`:

```typescript
useEffect(() => {
  const currentReel = state.reels[state.currentIndex];
  if (currentReel) {
    videoPlayerController.playReel(currentReel.id);
  }
}, [state.currentIndex, state.reels]);
```

### Memory Management

The VideoPlayerController automatically:
- Keeps only 3 videos in memory
- Preloads next/previous videos
- Clears cache after 5 minutes
- Respects 500MB cache limit

Monitor usage:

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

### Gesture Handling

Customize gesture detection in `useGestureHandler` hook:

```typescript
const handleTap = useCallback((callback: () => void) => {
  const now = Date.now();
  const timeSinceLast = now - lastTapRef.current;

  if (timeSinceLast < 300) {  // Double-tap threshold (ms)
    // Double tap
    callback();
  }
}, []);
```

### Comments System

Comments are cached after first load. Control caching:

```typescript
private commentCache: Map<string, Comment[]> = new Map();

async fetchComments(reelId: string, page: number = 0): Promise<Comment[]> {
  // Checks cache first
  if (this.commentCache.has(reelId)) {
    return this.commentCache.get(reelId)!;
  }
  // ... fetch and cache
}
```

## Performance Optimization

### 1. Lazy Loading

Comments and additional data load on-demand:

```typescript
const handleComment = useCallback((reelId: string) => {
  const reel = state.reels.find((r) => r.id === reelId);
  if (reel) {
    loadCommentsForReel(reel.id);  // Loads when needed
    setIsCommentsOpen(true);
  }
}, [state.reels]);
```

### 2. Throttled Callbacks

Scroll and gesture events are throttled to prevent jank:

```typescript
const handleScroll = useThrottledCallback(() => {
  // Only runs once every 300ms
}, 300);
```

### 3. Video Preloading

Next video starts loading before user scrolls to it:

```typescript
useEffect(() => {
  if (reels.length > 0 && currentIndex < reels.length - 1) {
    const nextReel = reels[currentIndex + 1];
    if (nextReel?.videoUrl) {
      videoPlayerController.preloadVideo(nextReel.videoUrl);
    }
  }
}, [currentIndex, reels]);
```

### 4. Optimistic Updates

UI updates immediately, network requests happen asynchronously:

```typescript
const handleLike = useCallback(async (reelId: string) => {
  // Update UI immediately
  actions.toggleLike(reelId);
  
  // Send request in background
  try {
    await reelsApiService.likeReel(reelId);
  } catch (error) {
    // Revert on error
    actions.toggleLike(reelId);
  }
}, [actions]);
```

## Testing

### Unit Testing

```typescript
// Test state management
describe('useReelsFeed', () => {
  it('should toggle like state', () => {
    // Test implementation
  });

  it('should handle pagination', () => {
    // Test implementation
  });
});
```

### Integration Testing

```typescript
// Test components
describe('FullscreenVideoPlayer', () => {
  it('should play on mount', () => {
    // Test implementation
  });

  it('should pause when scrolled away', () => {
    // Test implementation
  });
});
```

### E2E Testing

```typescript
// Test user flows
describe('Reels Feed', () => {
  it('should like a reel', () => {
    // Test complete flow
  });

  it('should load comments', () => {
    // Test complete flow
  });
});
```

## Troubleshooting

### Video Won't Play

1. Check video URL is valid and accessible
2. Verify CORS headers are set correctly
3. Check browser autoplay policy
4. Try user interaction first (tap to play)

### Scroll Stutters

1. Check video resolution (use 720p or lower)
2. Reduce number of cached players (maxCachedPlayers)
3. Enable hardware acceleration in browser
4. Check for CPU-intensive tasks

### Comments Not Loading

1. Verify API endpoint is correct
2. Check authentication headers
3. Review network tab for errors
4. Check comment cache limit

### Memory Leaks

1. Ensure VideoPlayerController disposes resources
2. Check useEffect cleanup functions
3. Monitor with browser DevTools Memory tab
4. Reduce cache size if needed

## Browser DevTools Tips

### Performance Analysis

1. Open DevTools → Performance tab
2. Record scrolling interaction
3. Look for dropped frames or jank
4. Check for long tasks

### Memory Usage

1. Open DevTools → Memory tab
2. Take heap snapshot
3. Compare before/after heavy operations
4. Look for growing allocations

### Network Debugging

1. Open DevTools → Network tab
2. Enable "Disable cache" for testing
3. Throttle to "Slow 3G" to test preloading
4. Check video transfer timing

## Deployment Checklist

- [ ] Update API endpoint in `.env`
- [ ] Configure CORS headers on backend
- [ ] Set up video hosting/CDN
- [ ] Test on slow networks (3G simulation)
- [ ] Test on mobile devices
- [ ] Verify autoplay policies
- [ ] Set up analytics tracking
- [ ] Enable error logging/monitoring
- [ ] Optimize video codec (H.264)
- [ ] Configure caching headers

## Support & Resources

- **Types**: See `types.ts` for all interfaces
- **Hooks**: See `hooks/index.ts` for custom hooks
- **Utils**: See `utils/index.ts` for helper functions
- **Theme**: See `theme/index.ts` for theme system
- **Animations**: See `animations/index.ts` for animation utilities

## License

This implementation is part of WizChat and follows the project's license.
