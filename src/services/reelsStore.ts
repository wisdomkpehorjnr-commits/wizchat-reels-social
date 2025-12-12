import { supabase } from '@/integrations/supabase/client';

const LIKES_KEY = 'wiz_reels_likes_v1';
const COMMENTS_KEY = 'wiz_reels_comments_v1';

type LikesMap = Record<string, { like: boolean; count: number }>; // postId -> like/dislike and count

export const reelsStore = {
  getLikes(): LikesMap {
    try {
      const raw = localStorage.getItem(LIKES_KEY) || '{}';
      return JSON.parse(raw) as LikesMap;
    } catch (e) {
      return {};
    }
  },
  setLike(postId: string, liked: boolean, count?: number) {
    const map = this.getLikes();
    map[postId] = { like: liked, count: typeof count === 'number' ? count : (map[postId]?.count || 0) };
    localStorage.setItem(LIKES_KEY, JSON.stringify(map));
  },
  getLike(postId: string) {
    const map = this.getLikes();
    return map[postId] || null;
  },

  // Comments: quick local cache for optimistic updates
  getComments(postId: string) {
    try {
      const raw = localStorage.getItem(COMMENTS_KEY) || '{}';
      const all = JSON.parse(raw) as Record<string, any[]>;
      return all[postId] || [];
    } catch (e) {
      return [];
    }
  },
  pushComment(postId: string, comment: any) {
    const raw = localStorage.getItem(COMMENTS_KEY) || '{}';
    const all = JSON.parse(raw) as Record<string, any[]>;
    all[postId] = all[postId] || [];
    all[postId].push(comment);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  },

  // Try to sync like to server (best-effort)
  async syncLikeToServer(postId: string, userId: string | undefined, like: boolean) {
    if (!userId) return;
    try {
      // Try to call RPC or table - fallback to upsert on likes table if exists
      await supabase.from('reel_likes').upsert({ post_id: postId, user_id: userId, liked: like });
    } catch (e) {
      console.warn('[reelsStore] syncLikeToServer failed', e);
    }
  }
};
