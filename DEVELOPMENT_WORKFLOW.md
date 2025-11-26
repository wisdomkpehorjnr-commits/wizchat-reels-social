# Development Workflow & Best Practices

## 🎯 Getting Started with Reels Development

### First Time Setup (5 minutes)

1. **Understand the architecture**
   ```bash
   # Read these in order:
   1. REELS_QUICK_REFERENCE.md (2 min overview)
   2. src/components/reels/README.md (3 min technical)
   ```

2. **Explore the codebase**
   ```bash
   # Open these files to understand structure:
   - src/components/reels/index.ts (exports)
   - src/components/reels/types.ts (data structures)
   - src/components/reels/ReelsFeedScreen.tsx (main component)
   ```

3. **Test basic functionality**
   ```bash
   # In your app
   import { ReelsFeedScreen } from '@/components/reels';
   
   export default function TestReels() {
    return <ReelsFeedScreen />;
   }
   ```

---

## 💻 Common Development Tasks

### Task 1: Adding a New Feature to Action Bar

**Goal**: Add a "Report" button to the action bar

**Steps**:

1. **Update type definitions** (`src/components/reels/types.ts`)
   ```typescript
   // No changes needed - already has extensibility
   ```

2. **Add to ActionBar** (`src/components/reels/widgets/ActionBar.tsx`)
   ```typescript
   interface ActionBarProps {
     // ... existing props
     onReport?: (reelId: string) => void;
   }
   
   // Add button in JSX
   <ActionButton
     icon={<Flag className="w-6 h-6" />}
     label="Report"
     onClick={() => onReport?.(reel.id)}
   />
   ```

3. **Handle in ReelsFeedScreen** (`src/components/reels/ReelsFeedScreen.tsx`)
   ```typescript
   const handleReport = useCallback((reelId: string) => {
     console.log('Report reel:', reelId);
     // Show report dialog
   }, []);
   
   <ActionBar
     // ... other props
     onReport={handleReport}
   />
   ```

4. **Test**
   - Click the button
   - Verify handler is called
   - Check console logs

---

### Task 2: Customizing Theme Colors

**Goal**: Change primary color from pink to red

**Steps**:

1. **Open theme file** (`src/components/reels/theme/index.ts`)

2. **Update color**
   ```typescript
   const darkTheme: ReelTheme = {
     colors: {
       primary: '#ff0000', // Changed from #ff006e
       // ... other colors
     },
   };
   ```

3. **Test**
   - Run dev server
   - Like button should now be red
   - Follow button should be red
   - All accents should match

---

### Task 3: Changing Video Preload Strategy

**Goal**: Preload 2 videos instead of 1

**Steps**:

1. **Open controller** (`src/components/reels/services/VideoPlayerController.ts`)

2. **Update buffer**
   ```typescript
   private preloadBuffer = 2; // Changed from 1
   ```

3. **Impact**:
   - More memory usage
   - Smoother scrolling
   - Better for fast connections

---

### Task 4: Adding Custom Animations

**Goal**: Add a custom "shake" animation

**Steps**:

1. **Add keyframe** (`src/components/reels/animations/index.ts`)
   ```typescript
   export const shakeKeyframes = keyframes`
     0%, 100% { transform: translateX(0); }
     10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
     20%, 40%, 60%, 80% { transform: translateX(5px); }
   `;
   ```

2. **Add to animations object**
   ```typescript
   export const animations = {
     // ... existing
     shake: css`
       animation: ${shakeKeyframes} 0.5s;
     `,
   };
   ```

3. **Use in component**
   ```typescript
   import { animations } from '@/components/reels';
   
   <motion.div css={animations.shake}>
     Content that shakes
   </motion.div>
   ```

---

## 🔍 Debugging Workflow

### Problem: Videos Not Playing

**Diagnostic Steps**:

```typescript
// 1. Check if video URL is valid
const reel = state.reels[state.currentIndex];
console.log('Video URL:', reel.videoUrl);

// 2. Check player state
const playerState = videoPlayerController.getPlaybackState(reel.id);
console.log('Player state:', playerState);

// 3. Check visibility
console.log('Is visible:', isVisible);

// 4. Check if it's a browser policy issue
// Safari/iOS requires user gesture first
```

**Solutions**:
- Verify CORS headers on video server
- Check video format (must be H.264 MP4)
- Enable hardware acceleration
- Check browser autoplay policy
- Try clicking on video to manually play

---

### Problem: Scroll Stuttering

**Diagnostic Steps**:

```typescript
// 1. Check scroll throttle
// src/components/reels/ReelsFeedScreen.tsx - look for useThrottledCallback

// 2. Monitor frame rate
// DevTools → Performance tab → record scroll

// 3. Check cache size
const stats = videoPlayerController.getStats();
console.log('Cache:', stats.cacheSize);

// 4. Check active players
console.log('Active players:', stats.activePlayersCount);
```

**Solutions**:
- Reduce maxCachedPlayers from 3 to 2
- Reduce video resolution
- Increase throttle delay
- Clear browser cache
- Close other tabs
- Enable hardware acceleration

---

### Problem: Memory Leak

**Diagnostic Steps**:

```typescript
// 1. Take heap snapshot (DevTools Memory tab)
// Take initial snapshot
// Scroll to load 20 videos
// Take another snapshot
// Compare - should not grow significantly

// 2. Check disposed players
console.log(videoPlayerController.getStats());

// 3. Check event listeners
// DevTools Elements tab → Event Listeners
```

**Solutions**:
- Ensure cleanup in useEffect
- Call disposePlayer on unmount
- Check for circular references
- Monitor with DevTools regularly
- Test on low-end devices

---

## 🧪 Testing Strategy

### Unit Tests Example

```typescript
// Test useVideoPlayer hook
describe('useVideoPlayer', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVideoPlayer(mockReel, mockRef));
    expect(result.current.isPlaying).toBe(false);
  });

  it('should toggle play state', async () => {
    const { result } = renderHook(() => useVideoPlayer(mockReel, mockRef));
    await result.current.togglePlayPause();
    expect(result.current.isPlaying).toBe(true);
  });
});
```

### Integration Tests Example

```typescript
// Test like flow
describe('Like Feature', () => {
  it('should like and unlike a reel', async () => {
    render(<ReelsFeedScreen />);
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);
    
    await waitFor(() => {
      expect(reelsApiService.likeReel).toHaveBeenCalled();
    });
  });
});
```

### E2E Tests Example

```typescript
// Test complete flow
describe('Reels Flow', () => {
  it('should load reels and allow user to like', async () => {
    cy.visit('/reels');
    cy.get('video').should('be.visible');
    cy.get('button').contains('Like').click();
    cy.get('button').contains('Like').should('have.class', 'active');
  });
});
```

---

## 📊 Performance Profiling

### Check Memory Usage

```typescript
// React DevTools Profiler
// 1. Open DevTools → Profiler
// 2. Record interaction
// 3. Look for "Wasted renders"
// 4. Optimize with useMemo/useCallback

// Chrome DevTools Memory
// 1. Heap snapshots
// 2. Allocation timeline
// 3. Look for growing allocations
```

### Check Frame Rate

```typescript
// Performance Monitor (Chrome)
// 1. DevTools → More tools → Performance Monitor
// 2. Scroll reels feed
// 3. Monitor FPS (should stay near 60)
// 4. Check CPU usage

// If <30fps:
// - Reduce video resolution
// - Reduce cache players
// - Check for CPU-intensive tasks
```

### Check Network

```typescript
// Network tab analysis
// 1. Check video download time
// 2. Look for waterfall (shouldn't be too long)
// 3. Monitor bandwidth usage
// 4. Check for failed requests

// If slow:
// - Use CDN
// - Pre-compress videos
// - Enable gzip
// - Check server response time
```

---

## 🚀 Optimization Checklist

Before shipping to production:

### Code Quality
- [ ] No console errors or warnings
- [ ] All TypeScript types correct
- [ ] No eslint violations
- [ ] Code follows existing patterns
- [ ] Comments for complex logic

### Performance
- [ ] Scroll smooth (60fps)
- [ ] Videos load quickly
- [ ] Memory stable on long scroll
- [ ] No layout shifts
- [ ] Animations smooth

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing complete
- [ ] Mobile testing complete

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] High contrast mode works
- [ ] Touch targets large enough

### Browser Support
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] iOS Safari 14+
- [ ] Android Chrome

---

## 📋 Code Review Checklist

When reviewing Reels code:

- [ ] Uses correct imports from reels module
- [ ] Types are properly defined
- [ ] No hardcoded values (use theme/constants)
- [ ] Error handling included
- [ ] Performance considered
- [ ] Mobile-friendly
- [ ] Follows existing patterns
- [ ] Comments explain why, not what
- [ ] Tests included for new features
- [ ] Documentation updated

---

## 🔄 CI/CD Integration

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

npm run lint -- --fix
npm run type-check
```

### GitHub Actions Example

```yaml
name: Test Reels

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run lint -- src/components/reels
      - run: npm run type-check
      - run: npm test -- reels
      - run: npm run build
```

---

## 📚 Learning Resources

### Getting Deeper Understanding

1. **Video Player Concepts**
   - Read: `VideoPlayerController.ts` comments
   - Understand: memory management strategy
   - Practice: modify cache settings

2. **State Management**
   - Read: `ReelsFeedContext.tsx` reducer
   - Understand: reducer pattern
   - Practice: add new state property

3. **Animations**
   - Read: `animations/index.ts`
   - Understand: keyframe animations
   - Practice: create custom animation

4. **Custom Hooks**
   - Read: `hooks/index.ts`
   - Understand: useVideoVisibility pattern
   - Practice: create similar hook

---

## 💡 Pro Tips

1. **Use React DevTools Profiler**
   - Identifies performance issues
   - Shows component render times
   - Helps optimize re-renders

2. **Chrome DevTools Performance Tab**
   - Record interactions
   - Look for long tasks
   - Check frame rate

3. **Test on Real Devices**
   - Animations feel different
   - Touch responsiveness varies
   - Performance varies significantly

4. **Monitor in Production**
   - Use error tracking (Sentry, etc.)
   - Monitor performance metrics
   - Track user feedback

5. **Version Your Changes**
   - Use feature flags
   - Gradual rollout
   - Easy rollback if needed

---

## 🎓 Knowledge Base

### Quick Answers

**Q: How do I change the number of cached videos?**
A: Edit `VideoPlayerController.ts` line with `maxCachedPlayers`

**Q: How do I add a new action button?**
A: Add to `ActionBar.tsx` and handle in `ReelsFeedScreen.tsx`

**Q: How do I customize the theme?**
A: Edit colors in `theme/index.ts`

**Q: How do I disable preloading?**
A: Set `preloadBuffer = 0` in VideoPlayerController

**Q: How do I change animation speed?**
A: Edit keyframe duration in `animations/index.ts`

---

## 🎯 Success Metrics

Track these to know if everything is working:

- **Scroll FPS**: Should be 55-60 (desktop) or 45-60 (mobile)
- **Video Load Time**: Should be <1 second
- **Memory Usage**: Should stay <100MB after scroll
- **Time to Like**: Should feel instant (<100ms feedback)
- **API Response Time**: Should be <500ms
- **Cache Hit Rate**: Should be >90% for adjacent videos

---

## 🚨 Emergency Procedures

### Reels Not Loading

```typescript
// 1. Check if component is imported
import { ReelsFeedScreen } from '@/components/reels';

// 2. Check if data is returned from API
const reels = await reelsApiService.fetchReels(0);
console.log(reels); // Should show array

// 3. Check if state is updating
const { state } = useReelsFeed();
console.log(state.reels); // Should show loaded reels

// 4. Check if visible on page
// DevTools → Elements → Find ReelsFeedScreen component
```

### Rollback Procedure

```bash
# If critical issues:
1. git revert <commit-hash>
2. git push
3. Notify team
4. Create incident report
```

---

This guide should help navigate development tasks efficiently and maintain code quality throughout the project.
