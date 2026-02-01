/**
 * Persistent Feed Store Hook
 * 
 * Provides a zero-reload home feed experience:
 * - Instant hydration from memory + IndexedDB on mount
 * - Delta-only fetching (only new posts since last fetch)
 * - Supabase Realtime for live updates (new posts, likes, comments)
 * - Scroll position preservation across tab switches
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types';
import { cacheService } from '@/services/cacheService';

// =============================================
// PERSISTENT IN-MEMORY STORE (survives remounts)
// =============================================
const FEED_CACHE_KEY = 'wizchat_feed_v2';
const PINNED_CACHE_KEY = 'wizchat_pinned_v2';
const MIN_DELTA_INTERVAL_MS = 30 * 1000; // 30 seconds between delta fetches
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FeedStoreState {
  posts: Post[];
  pinnedIds: string[];
  scrollY: number;
  lastFetchTime: number;
  newestPostDate: string | null;
  hasInitialized: boolean;
}

// Module-level store - persists across component remounts
const feedStore: FeedStoreState = {
  posts: [],
  pinnedIds: [],
  scrollY: 0,
  lastFetchTime: 0,
  newestPostDate: null,
  hasInitialized: false,
};

// Initialize from IndexedDB on module load
const initializeFeedStore = async () => {
  if (feedStore.hasInitialized) return;
  feedStore.hasInitialized = true;

  try {
    const [cachedPosts, cachedPinned] = await Promise.all([
      cacheService.get<{ posts: Post[]; newestDate: string | null; timestamp: number }>(FEED_CACHE_KEY),
      cacheService.get<string[]>(PINNED_CACHE_KEY),
    ]);

    if (cachedPosts?.posts && Array.isArray(cachedPosts.posts)) {
      // Restore dates
      feedStore.posts = cachedPosts.posts.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        comments: p.comments?.map(c => ({ ...c, createdAt: new Date(c.createdAt) })) || [],
      }));
      feedStore.newestPostDate = cachedPosts.newestDate;
      feedStore.lastFetchTime = cachedPosts.timestamp || 0;
      console.debug('[FeedStore] Restored', feedStore.posts.length, 'posts from cache');
    }

    if (cachedPinned && Array.isArray(cachedPinned)) {
      feedStore.pinnedIds = cachedPinned;
    }
  } catch (e) {
    console.debug('[FeedStore] Cache restore failed:', e);
  }
};

// Call immediately
initializeFeedStore();

// Save to IndexedDB
const saveFeedToCache = async (posts: Post[], newestDate: string | null) => {
  try {
    await cacheService.set(
      FEED_CACHE_KEY,
      { posts, newestDate, timestamp: Date.now() },
      CACHE_TTL_MS
    );
  } catch (e) {
    console.debug('[FeedStore] Cache save failed:', e);
  }
};

const savePinnedToCache = async (pinnedIds: string[]) => {
  try {
    await cacheService.set(PINNED_CACHE_KEY, pinnedIds, CACHE_TTL_MS);
  } catch (e) {
    console.debug('[FeedStore] Pinned cache save failed:', e);
  }
};

// =============================================
// HOOK
// =============================================

interface UseFeedStoreOptions {
  userId?: string;
}

export function useFeedStore(options: UseFeedStoreOptions = {}) {
  const { userId } = options;
  
  const [posts, setPosts] = useState<Post[]>(feedStore.posts);
  const [pinnedIds, setPinnedIds] = useState<string[]>(feedStore.pinnedIds);
  const [loading, setLoading] = useState(feedStore.posts.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const deltaFetchingRef = useRef(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get sorted posts with pinned at top
  const getSortedPosts = useCallback((allPosts: Post[], pinned: string[]) => {
    const pinnedPosts = allPosts.filter(p => pinned.includes(p.id));
    const otherPosts = allPosts.filter(p => !pinned.includes(p.id));
    return [...pinnedPosts, ...otherPosts];
  }, []);

  // Fetch delta (only new posts since last fetch)
  const fetchDelta = useCallback(async () => {
    if (!userId || deltaFetchingRef.current) return;
    
    const now = Date.now();
    const timeSinceLast = now - feedStore.lastFetchTime;
    
    // Skip if recently fetched
    if (timeSinceLast < MIN_DELTA_INTERVAL_MS && feedStore.posts.length > 0) {
      console.debug('[FeedStore] Skipping delta fetch, too recent');
      return;
    }

    deltaFetchingRef.current = true;

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:user_id (id, name, username, email, avatar),
          comments:comments (id, user_id, post_id, content, created_at, user:user_id (id, name, username, email, avatar)),
          likes:likes (id, user_id)
        `)
        .order('created_at', { ascending: false });

      // Only fetch posts newer than our newest cached post
      if (feedStore.newestPostDate) {
        query = query.gt('created_at', feedStore.newestPostDate);
        console.debug('[FeedStore] Delta fetch since:', feedStore.newestPostDate);
      } else {
        // First load - limit to recent posts
        query = query.limit(50);
        console.debug('[FeedStore] Initial fetch, limit 50');
      }

      const [postsResult, pinnedResult] = await Promise.all([
        query,
        supabase.from('pinned_posts').select('post_id'),
      ]);

      if (!mountedRef.current) return;

      if (postsResult.error) throw postsResult.error;

      const newPosts = (postsResult.data || []).map((post: any) => {
        const likesData = (post.likes as any[]) || [];
        const userData = post.user as any;
        return {
          id: post.id,
          userId: post.user_id,
          user: {
            id: userData?.id || '',
            name: userData?.name || 'Unknown',
            username: userData?.username || 'unknown',
            email: userData?.email || '',
            photoURL: userData?.avatar || '',
            avatar: userData?.avatar || '',
            followerCount: 0,
            followingCount: 0,
            profileViews: 0,
            createdAt: new Date(),
          },
          content: post.content,
          imageUrl: post.image_url || undefined,
          imageUrls: post.image_url ? [post.image_url] : undefined,
          videoUrl: post.video_url || undefined,
          mediaType: (post.media_type as 'text' | 'image' | 'video') || 'text',
          isReel: post.is_reel || false,
          likes: likesData.map(l => l.user_id),
          comments: (post.comments || []).map((c: any) => {
            const cUser = c.user as any;
            return {
              id: c.id,
              userId: c.user_id,
              user: {
                id: cUser?.id || '',
                name: cUser?.name || 'Unknown',
                username: cUser?.username || 'unknown',
                email: cUser?.email || '',
                photoURL: cUser?.avatar || '',
                avatar: cUser?.avatar || '',
                followerCount: 0,
                followingCount: 0,
                profileViews: 0,
                createdAt: new Date(),
              },
              postId: c.post_id,
              content: c.content,
              createdAt: new Date(c.created_at),
            };
          }),
          reactions: [],
          hashtags: [],
          createdAt: new Date(post.created_at),
        } as Post;
      });

      const newPinnedIds = (pinnedResult.data || []).map(p => p.post_id);

      if (newPosts.length > 0) {
        // Merge new posts with existing (new at top, dedup by id)
        const existingIds = new Set(feedStore.posts.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        const merged = [...uniqueNewPosts, ...feedStore.posts];
        
        // Update newest date
        const newestDate = newPosts[0]?.createdAt?.toISOString() || feedStore.newestPostDate;
        
        feedStore.posts = merged;
        feedStore.newestPostDate = newestDate;
        feedStore.lastFetchTime = now;

        const sorted = getSortedPosts(merged, newPinnedIds);
        setPosts(sorted);
        await saveFeedToCache(merged, newestDate);
        
        console.debug('[FeedStore] Delta: added', uniqueNewPosts.length, 'new posts');
      } else if (!feedStore.newestPostDate && postsResult.data) {
        // Initial load with no new posts but we got data
        feedStore.lastFetchTime = now;
        if (postsResult.data.length > 0) {
          feedStore.newestPostDate = new Date(postsResult.data[0].created_at).toISOString();
        }
      }

      // Update pinned
      if (JSON.stringify(newPinnedIds) !== JSON.stringify(feedStore.pinnedIds)) {
        feedStore.pinnedIds = newPinnedIds;
        setPinnedIds(newPinnedIds);
        await savePinnedToCache(newPinnedIds);
      }

      setError(null);
    } catch (err) {
      console.error('[FeedStore] Delta fetch error:', err);
      if (feedStore.posts.length === 0) {
        setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
      }
    } finally {
      setLoading(false);
      deltaFetchingRef.current = false;
    }
  }, [userId, getSortedPosts]);

  // Full refresh (for manual refresh button)
  const fullRefresh = useCallback(async () => {
    if (!userId) return;
    
    setRefreshing(true);
    setError(null);

    try {
      const [postsResult, pinnedResult] = await Promise.all([
        supabase
          .from('posts')
          .select(`
            *,
            user:user_id (id, name, username, email, avatar),
            comments:comments (id, user_id, post_id, content, created_at, user:user_id (id, name, username, email, avatar)),
            likes:likes (id, user_id)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('pinned_posts').select('post_id'),
      ]);

      if (!mountedRef.current) return;

      if (postsResult.error) throw postsResult.error;

      const freshPosts = (postsResult.data || []).map((post: any) => {
        const likesData = (post.likes as any[]) || [];
        const userData = post.user as any;
        return {
          id: post.id,
          userId: post.user_id,
          user: {
            id: userData?.id || '',
            name: userData?.name || 'Unknown',
            username: userData?.username || 'unknown',
            email: userData?.email || '',
            photoURL: userData?.avatar || '',
            avatar: userData?.avatar || '',
            followerCount: 0,
            followingCount: 0,
            profileViews: 0,
            createdAt: new Date(),
          },
          content: post.content,
          imageUrl: post.image_url || undefined,
          imageUrls: post.image_url ? [post.image_url] : undefined,
          videoUrl: post.video_url || undefined,
          mediaType: (post.media_type as 'text' | 'image' | 'video') || 'text',
          isReel: post.is_reel || false,
          likes: likesData.map(l => l.user_id),
          comments: (post.comments || []).map((c: any) => {
            const cUser = c.user as any;
            return {
              id: c.id,
              userId: c.user_id,
              user: {
                id: cUser?.id || '',
                name: cUser?.name || 'Unknown',
                username: cUser?.username || 'unknown',
                email: cUser?.email || '',
                photoURL: cUser?.avatar || '',
                avatar: cUser?.avatar || '',
                followerCount: 0,
                followingCount: 0,
                profileViews: 0,
                createdAt: new Date(),
              },
              postId: c.post_id,
              content: c.content,
              createdAt: new Date(c.created_at),
            };
          }),
          reactions: [],
          hashtags: [],
          createdAt: new Date(post.created_at),
        } as Post;
      });

      const newPinnedIds = (pinnedResult.data || []).map(p => p.post_id);
      const newestDate = freshPosts[0]?.createdAt?.toISOString() || null;

      // Replace all
      feedStore.posts = freshPosts;
      feedStore.pinnedIds = newPinnedIds;
      feedStore.newestPostDate = newestDate;
      feedStore.lastFetchTime = Date.now();
      feedStore.scrollY = 0;

      const sorted = getSortedPosts(freshPosts, newPinnedIds);
      setPosts(sorted);
      setPinnedIds(newPinnedIds);

      await Promise.all([
        saveFeedToCache(freshPosts, newestDate),
        savePinnedToCache(newPinnedIds),
      ]);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.debug('[FeedStore] Full refresh:', freshPosts.length, 'posts');
    } catch (err) {
      console.error('[FeedStore] Full refresh error:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh'));
    } finally {
      setRefreshing(false);
    }
  }, [userId, getSortedPosts]);

  // Update a single post locally (for optimistic updates)
  const updatePostLocally = useCallback((postId: string, updater: (post: Post) => Post) => {
    setPosts(current => {
      const updated = current.map(p => (p.id === postId ? updater(p) : p));
      feedStore.posts = updated;
      saveFeedToCache(updated, feedStore.newestPostDate);
      return updated;
    });
  }, []);

  // Add a new post locally (for optimistic creation)
  const addPostLocally = useCallback((post: Post) => {
    setPosts(current => {
      const updated = [post, ...current];
      feedStore.posts = updated;
      feedStore.newestPostDate = post.createdAt.toISOString();
      saveFeedToCache(updated, feedStore.newestPostDate);
      return updated;
    });
  }, []);

  // Setup Realtime subscription for live updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('feed-realtime')
      // New posts
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
      }, async (payload) => {
        console.debug('[FeedStore] Realtime: new post', (payload.new as any).id);
        // Fetch the full post with relations
        const { data } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (id, name, username, email, avatar),
            likes:likes (id, user_id)
          `)
          .eq('id', (payload.new as any).id)
          .single();

        if (data && mountedRef.current) {
          const userData = data.user as any;
          const likesData = (data.likes as any[]) || [];
          const newPost: Post = {
            id: data.id,
            userId: data.user_id,
            user: {
              id: userData?.id || '',
              name: userData?.name || 'Unknown',
              username: userData?.username || 'unknown',
              email: userData?.email || '',
              photoURL: userData?.avatar || '',
              avatar: userData?.avatar || '',
              followerCount: 0,
              followingCount: 0,
              profileViews: 0,
              createdAt: new Date(),
            },
            content: data.content,
            imageUrl: data.image_url || undefined,
            imageUrls: data.image_url ? [data.image_url] : undefined,
            videoUrl: data.video_url || undefined,
            mediaType: (data.media_type as 'text' | 'image' | 'video') || 'text',
            isReel: data.is_reel || false,
            likes: likesData.map(l => l.user_id),
            comments: [],
            reactions: [],
            hashtags: [],
            createdAt: new Date(data.created_at),
          };

          // Only add if not already in list (avoid duplicates)
          if (!feedStore.posts.some(p => p.id === newPost.id)) {
            addPostLocally(newPost);
          }
        }
      })
      // Likes updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
      }, (payload) => {
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (!postId) return;

        // Refetch likes for this post
        supabase
          .from('likes')
          .select('id, user_id')
          .eq('post_id', postId)
          .then(({ data }) => {
            if (data && mountedRef.current) {
              const likeUserIds = data.map(l => l.user_id);
              updatePostLocally(postId, post => ({
                ...post,
                likes: likeUserIds,
              }));
            }
          });
      })
      // Comments updates
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, async (payload) => {
        const postId = (payload.new as any)?.post_id;
        if (!postId) return;

        const { data } = await supabase
          .from('comments')
          .select(`*, user:user_id (id, name, username, email, avatar)`)
          .eq('id', (payload.new as any).id)
          .single();

        if (data && mountedRef.current) {
          const commentUser = data.user as any;
          updatePostLocally(postId, post => ({
            ...post,
            comments: [
              ...post.comments,
              {
                id: data.id,
                userId: data.user_id,
                user: {
                  id: commentUser?.id || '',
                  name: commentUser?.name || 'Unknown',
                  username: commentUser?.username || 'unknown',
                  email: commentUser?.email || '',
                  photoURL: commentUser?.avatar || '',
                  avatar: commentUser?.avatar || '',
                  followerCount: 0,
                  followingCount: 0,
                  profileViews: 0,
                  createdAt: new Date(),
                },
                postId: data.post_id,
                content: data.content,
                createdAt: new Date(data.created_at),
              },
            ],
          }));
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [userId, updatePostLocally, addPostLocally]);

  // Initial load / delta fetch on mount
  useEffect(() => {
    if (!userId) return;
    
    // If we have cached data, show it immediately, then delta fetch in background
    if (feedStore.posts.length > 0) {
      setPosts(getSortedPosts(feedStore.posts, feedStore.pinnedIds));
      setLoading(false);
      // Background delta fetch
      fetchDelta();
    } else {
      // No cache, do full fetch
      fetchDelta();
    }
  }, [userId, fetchDelta, getSortedPosts]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Scroll position preservation
  useEffect(() => {
    const handleScroll = () => {
      feedStore.scrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get saved scroll position
  const getSavedScrollY = useCallback(() => feedStore.scrollY, []);

  return {
    posts,
    pinnedIds,
    loading,
    refreshing,
    error,
    fullRefresh,
    fetchDelta,
    updatePostLocally,
    addPostLocally,
    getSavedScrollY,
  };
}

// Export store for direct access (scroll position, etc.)
export const getFeedScrollPosition = () => feedStore.scrollY;
export const setFeedScrollPosition = (y: number) => { feedStore.scrollY = y; };
