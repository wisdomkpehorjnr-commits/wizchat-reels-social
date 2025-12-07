import { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, Image, Users, Video, Clock, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { searchService, SearchResult } from '@/services/searchService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts' | 'images' | 'groups' | 'reels'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchHistory(searchService.getSearchHistory());
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, activeTab]);

  const performSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      let searchResults: SearchResult[] = [];

      if (isOnline) {
        // Online: search with type filter
        const types = activeTab === 'all' 
          ? undefined 
          : [activeTab as 'people' | 'post' | 'image' | 'group' | 'reel'];
        searchResults = await searchService.search(query, types);
      } else {
        // Offline: search cached data
        const types = activeTab === 'all' 
          ? undefined 
          : [activeTab as 'people' | 'post' | 'image' | 'group' | 'reel'];
        searchResults = await searchService.searchOffline(query, types);
      }

      // Filter by active tab if not 'all'
      if (activeTab !== 'all') {
        searchResults = searchResults.filter(r => r.type === activeTab);
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    switch (result.type) {
      case 'people':
        navigate(`/profile/${result.data.username}`);
        onClose();
        break;
      case 'post':
        navigate(`/?post=${result.id}`);
        onClose();
        break;
      case 'image':
        navigate(`/?post=${result.data.id}`);
        onClose();
        break;
      case 'group':
        // Handle group join
        try {
          // Try to join the group
          const { error } = await supabase
            .from('topic_room_members')
            .insert({
              room_id: result.id,
              user_id: user?.id
            });
          
          if (error && error.code !== '23505') { // Ignore duplicate key error
            // If insert fails, try to navigate anyway (might already be a member)
            console.log('Group join error (might already be member):', error);
          }
          
          navigate(`/topic-room/${result.id}`);
          if (!error || error.code === '23505') {
            toast({
              title: "Joined Group",
              description: `You've joined ${result.title}`
            });
          }
        } catch (error) {
          console.error('Error joining group:', error);
          // Still navigate even if join fails
          navigate(`/topic-room/${result.id}`);
          toast({
            title: "Opening Group",
            description: "Opening group..."
          });
        }
        onClose();
        break;
      case 'reel':
        navigate(`/reels?reel=${result.id}`);
        onClose();
        break;
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const clearHistory = () => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
    toast({
      title: "History Cleared",
      description: "Search history has been cleared"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, posts, images, groups, reels..."
              className="pl-10 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {!query.trim() ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Recent Searches</h3>
                  {searchHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                {searchHistory.length > 0 ? (
                  <div className="space-y-2">
                    {searchHistory.map((item, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleHistoryClick(item)}
                      >
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        {item}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recent searches
                  </p>
                )}
              </div>
            ) : loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-3/4 h-4" />
                      <Skeleton className="w-1/2 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="p-4 space-y-2">
                {results.map((result) => (
                  <Card
                    key={`${result.type}-${result.id}`}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {result.image ? (
                          <Avatar className="w-12 h-12 flex-shrink-0">
                            <AvatarImage src={result.image} />
                            <AvatarFallback>
                              {result.type === 'people' ? (
                                <User className="w-6 h-6" />
                              ) : result.type === 'post' ? (
                                <FileText className="w-6 h-6" />
                              ) : result.type === 'image' ? (
                                <Image className="w-6 h-6" />
                              ) : result.type === 'group' ? (
                                <Users className="w-6 h-6" />
                              ) : (
                                <Video className="w-6 h-6" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {result.type === 'people' ? (
                              <User className="w-6 h-6 text-muted-foreground" />
                            ) : result.type === 'post' ? (
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            ) : result.type === 'image' ? (
                              <Image className="w-6 h-6 text-muted-foreground" />
                            ) : result.type === 'group' ? (
                              <Users className="w-6 h-6 text-muted-foreground" />
                            ) : (
                              <Video className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        {result.type === 'group' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResultClick(result);
                            }}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No results found</p>
                {!isOnline && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing cached results only. Connect to internet for more results.
                  </p>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default GlobalSearch;

