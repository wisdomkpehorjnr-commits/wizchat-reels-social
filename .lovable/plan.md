## Plan: WizChat 9-Point Fixes

### 1. Install Popup Text Visibility
- `PwaInstallPrompt.tsx`: The "Install" button uses `bg-foreground text-background` which renders black-on-black in Ultra/dark themes (text invisible — matches screenshot). Switch to primary green button: `bg-primary text-primary-foreground` with visible "Install" label + Download icon. Ensure same fix for the "Not now" muted button.

### 2. PWA Service-Worker Offline Page
- Replace the basic "You're offline" SW fallback page (shown in screenshot #1 at app boot when SW serves offline shell) with HTML that mirrors `OfflineScreen.tsx` exactly: centered glass card, WifiOff icon, "No Internet" title, two-line subtitle, white Retry button.
- Update `public/service-worker.js` offline HTML response (or `public/offline.html`) and ensure it's precached.

### 3. Remove All Red Error Toasts (offline-triggered)
- Audit `toast({ variant: 'destructive' })` and `toast.error(...)` calls across the app; wrap network-related ones to silently no-op when `!navigator.onLine` OR remove entirely for offline-typical actions (post, like, comment, follow, send-message, search, refresh).
- Keep success/info toasts. Keep destructive variant only for explicit user-confirmation dialogs (delete confirms).
- Search targets: `src/**/*.tsx` + services for `toast.error`, `variant: "destructive"`, "Failed to", "Error".

### 4. "People You May Know" — Pinned + Every 30 Posts + Friends-of-Friends
- Create `src/services/peopleYouMayKnowService.ts`:
  - Query: friends-of-friends (users followed/friends-of-friends of current user, excluding self & existing friends).
  - Cache result in IndexedDB/localStorage under `pymk-cache-v1` (TTL 24h, served instantly offline).
- Update `Home.tsx` feed render: inject the PYMK card after every 30 posts. Always render the first one pinned at the top of the feed (above first post) and again at index 30, 60, 90…
- Card uses existing `FriendsSuggestionCard.tsx` style; pull from cached service so it shows offline.

### 5. WizAi "Unauthorized" Fix
- Inspect `supabase/functions/wizai-chat/index.ts` for auth checks; likely missing `LOVABLE_API_KEY` env, missing `verify_jwt` config in `supabase/config.toml`, or sending wrong header.
- Fix: ensure `LOVABLE_API_KEY` secret exists (add via secrets tool if missing), update function to use Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`) with `Authorization: Bearer ${LOVABLE_API_KEY}` (per Lovable AI docs), and set `verify_jwt = false` in `supabase/config.toml` if function is publicly callable.
- Redeploy edge function.

### 6. Profile Page Navigation
- Remove the glass back button from `ProfileBackControls.tsx` (keep swipe-down only) — it overlaps the top-left logo per user.
- Increase swipe sensitivity: lower threshold from 120px → 60px, start zone from 80px → 160px, allow swipe from anywhere when scrollY≤0.
- Fix Global Search → Profile → Back navigation: ensure `navigate(-1)` returns to search. Check `GlobalSearch.tsx` — if it uses a modal/overlay (not a route), back goes home. Wrap search navigation so opening a profile pushes the search state, OR route global search to a `/search` page so back works naturally.

### 7. Ultra Theme Visibility (from screenshots)
- Screenshot #2 (Profile + Saved Post Options): dialog uses white `bg-card` with black close X invisible on white in dark/Ultra — fix dialog to use semantic tokens (already-done check) and ensure close button uses `text-foreground`.
- Screenshot #3 (Media Options dialog): white-on-white buttons invisible — replace with `bg-secondary text-secondary-foreground` rows with visible labels "Download Media" / "Save to Profile".
- Screenshot #6 (Chat Settings menu): icons only, no labels visible in Ultra (icons rendered white on white background panel) — add text labels next to each icon AND ensure menu uses theme-aware tokens.

### 8. Custom Font Selector in Settings
- Add a "Typography" / "Font" tab in `Settings.tsx` with preset options: System, Inter, Poppins, Space Grotesk, Playfair, Roboto, Lora, JetBrains Mono.
- Persist selection in `localStorage` under `wizchat-font-family`.
- Apply via CSS variable `--app-font` on `<html>` root + global `body { font-family: var(--app-font) }` rule in `index.css`.
- Load Google Fonts dynamically via `<link>` injection on selection.

### 9. Notification Popup Expand
- Add Expand icon (lucide `Maximize2`) to header of `NotificationCenter.tsx` / notification dropdown.
- Onclick: navigate to new full-page route `/notifications` rendering full transparent glass page with:
  - Glass back arrow (top-left), title "Notifications", list of all notifications.
  - Cache notifications in localStorage `notifications-cache-v1` so route opens offline.
- Add route to `App.tsx`.

### Theme Awareness
- Every new/touched component uses semantic tokens (`bg-card`, `text-foreground`, `bg-primary`, etc.). No hardcoded colors.

### Files Created
- `src/services/peopleYouMayKnowService.ts`
- `src/components/PeopleYouMayKnowCard.tsx` (or update existing)
- `src/pages/Notifications.tsx`
- `public/offline.html` (or inline in SW)

### Files Modified
- `src/components/PwaInstallPrompt.tsx`
- `public/service-worker.js`
- `src/pages/Home.tsx`
- `supabase/functions/wizai-chat/index.ts`, `supabase/config.toml`
- `src/components/profile/ProfileBackControls.tsx`
- `src/components/GlobalSearch.tsx` (route push)
- `src/components/chat/ChatSettingsMenu.tsx` (labels)
- `src/components/PostCard.tsx` (Media Options dialog)
- `src/pages/Profile.tsx` (Saved Post Options dialog)
- `src/pages/Settings.tsx`, `src/index.css` (font system)
- `src/components/NotificationCenter.tsx`, `src/App.tsx`
- Multiple files: removal of red offline toasts
