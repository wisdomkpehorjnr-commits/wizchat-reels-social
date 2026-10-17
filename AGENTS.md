# Architecture rules
- Resolve private storage through authenticated downloads for persistent media caching and signed URLs for direct playback; public object URLs alone cannot read private buckets.
- Keep cache identity independent of signed URL tokens so refreshed access preserves offline media.
- Upload all user media beneath the authenticated user's folder; never persist browser-only blob URLs as shared media.