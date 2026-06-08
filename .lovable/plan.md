## WizChat — 7 Improvements

### 1. Profile → Reels tab shows video thumbnails
- In `src/pages/Profile.tsx` reels grid, replace the white card with a `<video>` (preload="metadata") or `poster`/thumbnail image so each tile shows the first frame of the reel.
- Keep the existing tap-to-open behavior and the delete "X" icon.

### 2. Ultra theme contrast fixes
- Audit components rendering raw `text-white` / `text-black` / `bg-white` / `bg-black` and replace with semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) so the Ultra theme inverts correctly.
- Add Ultra-specific overrides in `src/index.css` `.ultra { ... }` for any stubborn third-party utilities (toasts, dialogs, menus) that still collide.
- Scope: most-used screens (Home feed, Chat list, Settings, Search, Comments, Topic Rooms, Profile, Reels overlays).

### 3. Search history clear options
- In the main Search page, store recent searches in localStorage.
- For each recent item add a small "×" to remove that single entry, plus a "Clear all" button at the top of the recent-searches list.

### 4. Data Saver actually works
- Fix `useMediaOptimization` so the toggle persists and is honored by reels/video components:
  - When OFF: autoplay enabled, quality follows user choice (Auto/480p/720p/1080p), preloading allowed.
  - When ON: tap-to-play, cap 480p, no autoplay, no preloading.
- Wire the Settings → Data Saver controls (toggle, quality picker, autoplay toggle) to read/write `mediaOptimizationService` and emit a change event so reel players react immediately.

### 5. Home post comments: like / reply / delete
- Extend the comments table usage: add `parent_id` (nullable) for replies and a `comment_likes` table (user_id, comment_id).
- In the comments UI under each post:
  - Heart button to like/unlike a comment (counter).
  - Reply button → inline composer; replies render threaded under the parent.
  - Trash icon visible only on the current user's own comments → confirm + delete (cascade removes its replies/likes).

### 6. Persistent like state across tab switches
- Cache like state in `homeStore` (or equivalent) and update optimistically.
- On tab remount, hydrate `isLiked`/`likesCount` from cache first, then reconcile with the background delta fetch — never reset to `false` while the network is in flight.
- Same fix applied to reels and topic-room posts where the bug appears.

### 7. Auto-route posts into matching Topic Rooms
- Keep posts in Home as today. Add a lightweight classifier that runs on post create/update:
  - Keyword + hashtag map for the 5 topic rooms (e.g. football, news, tech, entertainment, lifestyle — exact list pulled from the Topics tab).
  - On match, insert a row into `room_posts` linking the existing post to that room (or copy minimal fields, depending on current schema).
- `TopicRoom` page already reads `room_posts`, so matched posts appear in both Home and the relevant room with no duplication on Home.
- Backfill: one-off SQL to classify existing posts.

### Technical notes
- DB migrations: add `comments.parent_id uuid null`, `comment_likes` table with RLS + GRANTs, optional `post_topic_matches` if room_posts isn't reused.
- No backend changes to chat/archive/PWA shell.
- Ultra theme work is presentation-only (CSS + token swaps), no logic changes.

### Out of scope
- No redesign of Reels player, Chat, or PWA install flow.
- No new auth/roles.

Confirm and I'll implement all 7 in parallel batches.
