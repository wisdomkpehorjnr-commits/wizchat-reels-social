import { supabase } from '@/integrations/supabase/client';
import { Post, User } from '@/types';

export interface SearchResult {
  id: string;
  type: 'people' | 'post' | 'image' | 'group' | 'reel';
  title: string;
  subtitle?: string;
  image?: string;
  data: any;
  timestamp: number;
}

export interface SearchCache {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

const SEARCH_CACHE_KEY = 'search-cache';
const MAX_CACHED_RESULTS = 500;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

class SearchService {
  private cache: Map<string, SearchCache> = new Map();
  private searchHistory: string[] = [];

  constructor() {
    this.loadCache();
  }

  private async loadCache() {
    try {
      const cached = localStorage.getItem(SEARCH_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(data.cache || []);
        this.searchHistory = data.history || [];
      }
    } catch (error) {
      console.error('Error loading search cache:', error);
    }
  }

  private async saveCache() {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        history: this.searchHistory
      };
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving search cache:', error);
    }
  }

  async search(query: string, types?: ('people' | 'post' | 'image' | 'group' | 'reel')[]): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first
    const cached = this.cache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < MAX_CACHE_AGE) {
      // Return cached results filtered by type if specified
      if (types && types.length > 0) {
        return cached.results.filter(r => types.includes(r.type));
      }
      return cached.results;
    }

    // Add to search history
    if (!this.searchHistory.includes(normalizedQuery)) {
      this.searchHistory.unshift(normalizedQuery);
      this.searchHistory = this.searchHistory.slice(0, 20); // Keep last 20 searches
    }

    try {
      const results = await this.searchOnline(normalizedQuery, types);
      
      // Cache results
      this.cache.set(normalizedQuery, {
        query: normalizedQuery,
        results,
        timestamp: Date.now()
      });

      // Limit cache size
      if (this.cache.size > 100) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        this.cache = new Map(entries.slice(0, 100));
      }

      // Limit results in cache
      const allCachedResults: SearchResult[] = [];
      for (const cacheEntry of this.cache.values()) {
        allCachedResults.push(...cacheEntry.results);
      }
      
      if (allCachedResults.length > MAX_CACHED_RESULTS) {
        // Keep most recent results
        allCachedResults.sort((a, b) => b.timestamp - a.timestamp);
        const toKeep = allCachedResults.slice(0, MAX_CACHED_RESULTS);
        // Rebuild cache with limited results
        this.cache.clear();
        for (const result of toKeep) {
          const query = this.findQueryForResult(result);
          if (query) {
            const existing = this.cache.get(query) || { query, results: [], timestamp: Date.now() };
            existing.results.push(result);
            this.cache.set(query, existing);
          }
        }
      }

      await this.saveCache();
      return results;
    } catch (error) {
      console.error('Search error:', error);
      // Return cached results even if stale
      if (cached) {
        if (types && types.length > 0) {
          return cached.results.filter(r => types.includes(r.type));
        }
        return cached.results;
      }
      return [];
    }
  }

  private findQueryForResult(result: SearchResult): string | null {
    for (const [query, cache] of this.cache.entries()) {
      if (cache.results.some(r => r.id === result.id && r.type === result.type)) {
        return query;
      }
    }
    return null;
  }

  private async searchOnline(query: string, types?: ('people' | 'post' | 'image' | 'group' | 'reel')[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTypes = types || ['people', 'post', 'image', 'group', 'reel'];

    try {
      // Search People
      if (searchTypes.includes('people')) {
        const { data: people } = await supabase
          .from('profiles')
          .select('*')
          .or(`name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(50);

        if (people) {
          for (const person of people) {
            results.push({
              id: person.id,
              type: 'people',
              title: person.name || person.username,
              subtitle: `@${person.username}`,
              image: person.avatar,
              data: person,
              timestamp: Date.now()
            });
          }
        }
      }

      // Search Posts
      if (searchTypes.includes('post')) {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              name,
              username,
              avatar
            )
          `)
          .or(`content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (posts) {
          for (const post of posts) {
            results.push({
              id: post.id,
              type: 'post',
              title: post.content?.substring(0, 100) || 'Post',
              subtitle: `by ${post.user?.name || 'Unknown'}`,
              image: post.image_url || post.user?.avatar,
              data: post,
              timestamp: new Date(post.created_at).getTime()
            });
          }
        }
      }

      // Search Images (from posts)
      if (searchTypes.includes('image')) {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              name,
              username,
              avatar
            )
          `)
          .not('image_url', 'is', null)
          .or(`content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (posts) {
          for (const post of posts) {
            if (post.image_url) {
              results.push({
                id: post.id,
                type: 'image',
                title: post.content?.substring(0, 50) || 'Image',
                subtitle: `by ${post.user?.name || 'Unknown'}`,
                image: post.image_url,
                data: post,
                timestamp: new Date(post.created_at).getTime()
              });
            }
          }
        }
      }

      // Search Groups (topic rooms) - check if table exists
      if (searchTypes.includes('group')) {
        try {
          const { data: groups } = await supabase
            .from('topic_rooms')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(50);

          if (groups) {
            for (const group of groups) {
              results.push({
                id: group.id,
                type: 'group',
                title: group.name,
                subtitle: group.description?.substring(0, 100),
                image: (group as any).image_url || undefined,
                data: group,
                timestamp: new Date(group.created_at || Date.now()).getTime()
              });
            }
          }
        } catch (error) {
          // Table might not exist, skip groups
          console.log('Groups search not available:', error);
        }
      }

      // Search Reels
      if (searchTypes.includes('reel')) {
        const { data: reels } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              name,
              username,
              avatar
            )
          `)
          .not('video_url', 'is', null)
          .or(`content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (reels) {
          for (const reel of reels) {
            if (reel.video_url) {
              results.push({
                id: reel.id,
                type: 'reel',
                title: reel.content?.substring(0, 100) || 'Reel',
                subtitle: `by ${reel.user?.name || 'Unknown'}`,
                image: reel.image_url || reel.user?.avatar,
                data: reel,
                timestamp: new Date(reel.created_at).getTime()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching online:', error);
    }

    return results;
  }

  getSearchHistory(): string[] {
    return this.searchHistory;
  }

  clearSearchHistory() {
    this.searchHistory = [];
    this.saveCache();
  }

  async searchOffline(query: string, types?: ('people' | 'post' | 'image' | 'group' | 'reel')[]): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search through all cached results
    for (const cacheEntry of this.cache.values()) {
      for (const result of cacheEntry.results) {
        const matchesQuery = 
          result.title.toLowerCase().includes(normalizedQuery) ||
          result.subtitle?.toLowerCase().includes(normalizedQuery);
        
        if (matchesQuery) {
          if (!types || types.length === 0 || types.includes(result.type)) {
            results.push(result);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueResults = Array.from(
      new Map(results.map(r => [`${r.type}-${r.id}`, r])).values()
    );

    return uniqueResults;
  }
}

export const searchService = new SearchService();

