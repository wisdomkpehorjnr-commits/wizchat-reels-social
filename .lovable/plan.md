# WizChat — 8-Problem Fix Plan

This is a large multi-area pass. Each item lists what changes and where, so you can approve once and I implement straight through.

## 1. PWA opening screen — white logo, instant load
- `index.html`: change the boot splash background to white, keep the WizChat logo centered, remove any dark gradient. Add `<meta name="theme-color" content="#ffffff">`.
- `public/manifest.json`: `background_color` and `theme_color` → `#ffffff`.
- App shell renders instantly — no `SplashScreen.tsx` mount, no welcome animation, no white blank wait. The cached shell from the service worker shows immediately.

## 2. Data Saver toggle for reels
- `src/pages/Settings.tsx`: ensure a clean "Data Saver Mode" switch (already present via `mediaOptimizationService`) — wire its `autoplayVideos` to OFF when Data Saver is ON.
- Reels players (`ReelsModern/*`, `reels/widgets/FullscreenVideoPlayer.tsx`) respect `useMediaOptimization().settings.autoplayVideos` — if false, show tap-to-play overlay, otherwise autoplay.
- Persist via existing localStorage key, no extra storage needed.

## 3. Global Search redesigned (Facebook-style)
Rewrite `src/components/GlobalSearch.tsx` with 6 tabs: All, People, Posts, Images, Groups, Reels.
- **All**: 5 People (avatar, name, @user, badge, Follow), 5 Posts (PostCard mini), 5 Groups (image, name, members, Join), Reels as card grid. Each section ends with a "More…" link that switches to its tab.
- **People** tab: list rows with Follow + Add Friend buttons inline (no profile open needed).
- **Reels** tab: vertical card grid with thumbnail, creator, like/comment/share — respects data saver.
- **Groups** tab: verified/own groups, member count, recent post preview.
- **Posts / Images** tabs: full PostCard / image grid.
- Cached via `offlineDataManager` under `cache-search-<query>` so repeat searches are instant.

## 4. Remove "Cancel" from save/download popups
- `src/components/PostCard.tsx` and the media long-press popup: drop the explicit Cancel row (sheet dismiss-on-outside still works).

## 5. Theme contrast fixes
- `src/pages/Home.tsx`: "For You" / "Following" tabs use `text-foreground` / `text-muted-foreground` instead of hardcoded black.
- `src/index.css` ultra-theme block: ensure post action icons (like, comment, share) use `text-foreground` over transparent background, not white-on-white.
- Audit any `text-black` / `bg-white` on feed headers and replace with semantic tokens.

## 6. Topics auto-routing — text & images only
- New migration: update `auto_route_post_to_topic_rooms` trigger to **skip** posts when `NEW.is_reel = true`, when `NEW.video_url IS NOT NULL`, or when `NEW.media_type = 'video'`. Add a "Global News" room match for keywords (news, breaking, headline, politics, world, report). Keep football/tech/music/gossip; drop the Reel Review auto-route entirely.

## 7. Profile page works from everywhere
- Audit every navigation that lands on `/profile/:userId` (Friends, GlobalSearch, comments, post headers, group members, ClickableUserInfo, UserLink).
- Fix `src/pages/Profile.tsx` so it re-fetches when `useParams().userId` changes (reset state on id change, fetch from `profileService.getProfile(userId)` not from cached current user).
- `ClickableUserInfo` / `UserLink` always navigate with the user's real id from `profiles.id` (not username, not auth uid).

## 8. Full permanent offline caching
- `useImageCache`: bump TTL to effectively permanent (10 years) for avatars + post images, store blobs in IndexedDB once, never re-fetch.
- `offlineDataManager`: add `cacheSearch`, `cacheGroups`, ensure feed/reels/profile entries use the permanent TTL.
- Service worker: `CacheFirst` for `avatars/`, `posts/`, `covers/`, `room-media/` storage URLs with no expiry; videos use existing LRU cap.

## Technical notes
- One DB migration (topic trigger).
- One file rewrite: `GlobalSearch.tsx`.
- Targeted edits: `index.html`, `manifest.json`, `Home.tsx`, `Profile.tsx`, `ClickableUserInfo.tsx`, `UserLink.tsx`, `PostCard.tsx`, `index.css`, `useImageCache.tsx`, `offlineDataManager.ts`, reels player components, `public/service-worker.js`.
- No new dependencies.

Approve and I'll implement all 8 in one pass.