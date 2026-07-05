# Implementation Plan

## 1. Avatars never blink / flash initials
- Create `src/lib/avatarCache.ts`: synchronous localStorage-backed cache (`avatar:<url>` → data URL) with an in-memory Map for zero-latency reads on first render.
- New `<SmartAvatar user? src? name?>` wrapper around shadcn `Avatar`:
  - Reads cached data URL synchronously (no first paint with fallback).
  - Persists remote images to cache after first successful load (fetch → blob → dataURL).
  - Fallback = default human icon (see #2), never initials.
- Replace top-right header avatar in `Layout.tsx`, plus high-visibility spots: `ChatListItem`, `ChatMessage`, `PostCard`, `PeopleYouMayKnowCard`, `Profile` header, `ClickableUserInfo`, `UserSearch`, `FriendsSuggestionCard`, `Notifications`.
- Preload the current user's avatar once at app boot (in `AuthContext` after hydration) so header never flashes.

## 2. Default human icon for users with no picture
- Use `lucide-react`'s `UserRound` inside `AvatarFallback` (muted bg, muted-foreground icon) globally via `SmartAvatar`.
- Remove initial-letter fallbacks in `PeopleYouMayKnowCard`, `Profile`, `UserSearch`, `FriendsSuggestionCard`, and any other user avatar surfaces. Keep initials only for group-chat avatars where the user asked otherwise (they didn't — replace there too if it renders a user).

## 3. Settings — Language, High Contrast, 2FA
- **Language**: introduce `src/i18n/index.ts` (lightweight dict-based i18n, no lib) with `useT()` hook. Ship dictionaries for the languages already listed in Settings (en, es, fr, ar, hi, zh, pt, de, sw — whichever are in the current selector). Wrap visible strings on Home, Layout nav, Settings, CreatePost placeholder ("What's on your mind"), PostCard actions ("post", "Like", "Comment", "Share"). Persist selection in `app_settings.language`, apply `dir=rtl` for ar/he/fa/ur (already partially wired in `main.tsx`).
- **High contrast**: add `.high-contrast` CSS rules in `index.css` — force `font-weight: 700` on body text, boost token contrast (foreground pure, borders 2px, remove muted opacity). Toggle already stored; ensure it re-applies on load (already in main.tsx) and via live toggle in Settings.
- **2FA passcode**: new `src/features/passcode/` with:
  - `PasscodeSetupDialog` (Settings toggle → set 6-digit PIN, hashed with SHA-256 + salt, stored in `localStorage: passcode.<userId>`).
  - `PasscodeLockScreen` shown by `ProtectedRoute` when `passcode.enabled.<userId>` is true AND session-unlocked flag is missing (cleared on logout / page reload).
  - Wire toggle in Settings → "Enable Two-Factor Authentication".

## 4. Global Search improvements
- `GlobalSearch.tsx`: remove the extra close (X) icon(s) near/next-to the search bar; keep only the back navigation.
- Image results: attach long-press handler (600ms) → open action sheet with "Download to device" and "Save to profile" (writes into `saved_posts`). Reuse existing download util in `useDownload`.

## 5. Ultra theme fixes + new voice message bubble
- Audit media action menus in `PostCard` (download/save popup) and chat 3-dot menu (`ChatSettingsMenu`): replace hardcoded whites/blacks with `bg-popover text-popover-foreground border-border`, backdrop `bg-background/95`. Verify visible in Ultra (pure black/white) theme.
- New `src/components/chat/VoiceBubble.tsx`: compact (max-w 220px, h-10), play/pause circle button (primary), 24-bar animated wavy SVG that pulses with playback progress, duration text, subtle speed toggle (1x/1.5x/2x) inline. Replace usage in `ChatMessage` / `EnhancedMessageItem` / `VoiceMessagePlayer` render.

## Technical notes
- All new UI uses semantic tokens (`bg-popover`, `text-foreground`, `text-muted-foreground`, `border-border`) — verified against Light/Dark/Ultra/Ghana.
- No backend/schema changes required.
- Avatar cache uses same key strategy as existing `useImageCache` but exposes a **sync** read for zero-flash first paint.
- i18n is intentionally minimal (dictionary lookup with English fallback) to avoid adding heavy deps and to keep bundle small.

Approve and I'll implement in one pass.
