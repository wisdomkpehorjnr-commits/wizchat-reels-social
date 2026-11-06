# Architecture rules
- Resolve private storage through authenticated downloads for persistent media caching and signed URLs for direct playback; public object URLs alone cannot read private buckets.
- Keep cache identity independent of signed URL tokens so refreshed access preserves offline media.
- Upload all user media beneath the authenticated user's folder; never persist browser-only blob URLs as shared media.
- Check topic membership through a current-user SECURITY DEFINER helper, and join with conflict-ignore inserts; this avoids recursive RLS and unauthorized duplicate updates.
- New legacy group records share their chat's ID; conversation and metadata navigation must not use unrelated identifiers.
- Group deletion uses an authenticated owner-checked transaction; never delete memberships first and lose authorization mid-operation.
- Theme surfaces own paired semantic foregrounds; never force all descendants white or match background classes by substring, because filled actions, translucent states and media controls require different contrast pairs.
- Render Streak through PostCard's dedicated presentation mode so original media, proportions and expandable captions stay consistent; capture only that card, excluding overlay controls.
- Scope larger-screen navigation and toolbar icon treatment through the shared app-chrome-icon class and paired theme tokens, preserving mobile styling and filled-tab contrast.