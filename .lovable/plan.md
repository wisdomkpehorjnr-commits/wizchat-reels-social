
## Implementation Plan (Priority Order)

### Batch 1 - Quick Wins (This Message)
1. **Remove offline error popups** - Suppress all destructive toast messages when offline
2. **Read More on posts** - Truncate at 750 chars with toggle
3. **Save post from long press** - Add Save button to download popup, save to profile's Saved tab
4. **Followers/Following pages** - Full screen pages with search, follow buttons, pull to refresh

### Batch 2 - Group Enhancements (This Message)
5. **Group creation flow** - Add description, group type (Public/Private/Secret), message permissions toggle, approval toggle, tags/categories, max members
6. **Group admin settings panel** - Delete group, remove/block members, promote/demote admins, change settings, view members list, announcement mode
7. **Group member experience** - Join notifications, pin messages, view group info

### Batch 3 - Chat List Improvements (This Message)
8. **Unread badges** - Blue dot for unread chats
9. **Online indicator** - Green dot on profile pictures
10. **Visual improvements** - Bold unread chats, muted indicator, read receipts icons

### What's NOT feasible in one session (would need follow-up):
- WebSocket persistent connections (already using Supabase realtime)
- Push notifications (requires service worker + notification API setup)
- Profanity filter with word database
- Admin audit logs table (needs migration)
- Export chat feature
- Slow mode with timer enforcement
- Custom invite link generation
- Swipe gestures (archive, pin, mute by swiping)

Shall I proceed with Batches 1-3?
