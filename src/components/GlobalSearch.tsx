import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, FileText, Image, UserPlus, Play, Loader2, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { offlineChatService } from '@/services/offlineChatService';
import { dataService } from '@/services/dataService';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'image' | 'group' | 'reel';
  data: any;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('search-history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history).slice(0, 10));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToHistory = (term: string) => {
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];

    try {
      // Try offline search first
      const cachedResults = await offlineChatService.getCachedSearchResults(searchQuery);
      if (cachedResults.length > 0) {
        setResults(cachedResults as SearchResult[]);
      }

      if (!isOffline) {
        // Search users
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(20);

        if (users) {
          users.forEach(u => {
            allResults.push({
              id: u.id,
              type: 'user',
              data: u
            });
          });
        }

        // Search posts
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            user:profiles!posts_user_id_fkey (id, name, username, avatar)
          `)
          .ilike('content', `%${searchQuery}%`)
          .limit(20);

        if (posts) {
          posts.forEach(p => {
            allResults.push({
              id: p.id,
              type: p.is_reel ? 'reel' : (p.image_url ? 'image' : 'post'),
              data: p
            });
          });
        }

        // Search groups
        const { data: groups } = await supabase
          .from('groups')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .eq('is_private', false)
          .limit(20);

        if (groups) {
          groups.forEach(g => {
            allResults.push({
              id: g.id,
              type: 'group',
              data: g
            });
          });
        }

        setResults(allResults);

        // Cache results for offline use
        if (allResults.length > 0) {
          await offlineChatService.saveSearchResults(searchQuery, 'all', allResults);
        }

        // Save to history
        saveToHistory(searchQuery);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fall back to cached results
      const cachedResults = await offlineChatService.getCachedSearchResults(searchQuery);
      setResults(cachedResults as SearchResult[]);
    } finally {
      setLoading(false);
    }
  }, [isOffline, searchHistory]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const filterResults = (type: string) => {
    if (type === 'all') return results;
    if (type === 'people') return results.filter(r => r.type === 'user');
    if (type === 'posts') return results.filter(r => r.type === 'post');
    if (type === 'images') return results.filter(r => r.type === 'image' || (r.type === 'post' && r.data.image_url));
    if (type === 'groups') return results.filter(r => r.type === 'group');
    if (type === 'reels') return results.filter(r => r.type === 'reel' || (r.type === 'post' && r.data.is_reel));
    return results;
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  const handlePostClick = (postId: string) => {
    onClose();
    navigate(`/?post=${postId}`);
  };

  const handleGroupClick = async (groupId: string) => {
    if (!user) return;

    try {
      // Check if already a member
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        // Join the group
        await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });
        toast({ title: 'Joined group successfully!' });
      }

      onClose();
      // Navigate to group if you have a groups page
    } catch (error) {
      console.error('Error joining group:', error);
      toast({ title: 'Error', description: 'Failed to join group', variant: 'destructive' });
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      // Insert follow record
      await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: userId
      });
      toast({ title: 'Following user!' });
      // Refresh results
      performSearch(query);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search-history');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search people, posts, groups..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 h-10 bg-muted/50 border-primary/20"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          </div>

          {/* Offline indicator */}
          {isOffline && (
            <div className="max-w-2xl mx-auto mt-2">
              <Badge variant="secondary" className="text-xs">
                Offline - Showing cached results
              </Badge>
            </div>
          )}

          {/* Tabs */}
          <div className="max-w-2xl mx-auto mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-muted/50">
                <TabsTrigger value="all" className="text-xs py-2">All</TabsTrigger>
                <TabsTrigger value="people" className="text-xs py-2">
                  <Users className="w-3 h-3 mr-1" />
                  People
                </TabsTrigger>
                <TabsTrigger value="posts" className="text-xs py-2">
                  <FileText className="w-3 h-3 mr-1" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs py-2">
                  <Image className="w-3 h-3 mr-1" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="groups" className="text-xs py-2">
                  <Users className="w-3 h-3 mr-1" />
                  Groups
                </TabsTrigger>
                <TabsTrigger value="reels" className="text-xs py-2">
                  <Play className="w-3 h-3 mr-1" />
                  Reels
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-4">
            {/* Search History (when no query) */}
            {!query && searchHistory.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Searches
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs">
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleHistoryClick(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {query && (
              <div className="space-y-3">
                {filterResults(activeTab).length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results found for "{query}"</p>
                    {isOffline && <p className="text-sm mt-2">Try searching when online</p>}
                  </div>
                )}

                {filterResults(activeTab).map((result) => (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    {/* User result */}
                    {result.type === 'user' && (
                      <div className="flex items-center gap-3">
                        <Avatar
                          className="w-12 h-12 cursor-pointer"
                          onClick={() => handleUserClick(result.data.id)}
                        >
                          <AvatarImage src={result.data.avatar} />
                          <AvatarFallback>{result.data.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleUserClick(result.data.id)}
                        >
                          <p className="font-semibold">{result.data.name}</p>
                          <p className="text-sm text-muted-foreground">@{result.data.username}</p>
                        </div>
                        {result.data.id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                            onClick={() => handleFollow(result.data.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Follow
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Post result */}
                    {(result.type === 'post' || result.type === 'image' || result.type === 'reel') && (
                      <div
                        className="cursor-pointer"
                        onClick={() => handlePostClick(result.data.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={result.data.user?.avatar} />
                            <AvatarFallback>{result.data.user?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{result.data.user?.name}</p>
                            <p className="text-xs text-muted-foreground">@{result.data.user?.username}</p>
                          </div>
                          {result.data.is_reel && (
                            <Badge variant="secondary" className="ml-auto">
                              <Play className="w-3 h-3 mr-1" />
                              Reel
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2">{result.data.content}</p>
                        {result.data.image_url && (
                          <img
                            src={result.data.image_url}
                            alt=""
                            className="mt-2 rounded-lg w-full h-32 object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* Group result */}
                    {result.type === 'group' && (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{result.data.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {result.data.description || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.data.member_count || 0} members
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => handleGroupClick(result.data.id)}
                        >
                          Join
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalSearch;
