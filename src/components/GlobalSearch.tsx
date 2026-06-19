import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, FileText, Image as ImageIcon, Users, Video, Clock, Trash2, Heart, MessageCircle, Share2, UserPlus, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { searchService, SearchResult } from '@/services/searchService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import VerifiedBadge from './VerifiedBadge';
import ImageModal from './ImageModal';
import ReelSearchPreview from './search/ReelSearchPreview';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'all' | 'people' | 'posts' | 'images' | 'groups' | 'reels';

const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [friendRequestIds, setFriendRequestIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchHistory(searchService.getSearchHistory());
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(performSearch, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const r = isOnline
        ? await searchService.search(query, undefined)
        : await searchService.searchOffline(query, undefined);
      setResults(r);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Group results by type
  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = { people: [], post: [], image: [], group: [], reel: [] };
    for (const r of results) if (g[r.type]) g[r.type].push(r);
    return g;
  }, [results]);

  const goToProfile = (r: SearchResult) => {
    // DON'T close the search modal — Home persists `showSearch` in sessionStorage,
    // so when the user hits back from the profile they return to the open search.
    const id = r.data?.id || r.id;
    navigate(`/profile/${id}`);
  };

  const goToReels = () => { onClose(); navigate('/reels'); };
  const goToPosts = () => { onClose(); navigate('/'); };
  const goToGroup = (r: SearchResult) => { onClose(); navigate(`/topic-room/${r.id}`); };

  const openImage = (src?: string) => { if (!src) return; setImageModalSrc(src); setImageModalOpen(true); };

  const handleFollow = async (targetId: string) => {
    if (!user?.id || targetId === user.id) return;
    const already = followingIds.has(targetId);
    setFollowingIds(prev => { const n = new Set(prev); already ? n.delete(targetId) : n.add(targetId); return n; });
    try {
      if (already) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      }
    } catch (e: any) {
      if (e?.code !== '23505') {
        setFollowingIds(prev => { const n = new Set(prev); already ? n.add(targetId) : n.delete(targetId); return n; });
      }
    }
  };

  const handleAddFriend = async (targetId: string) => {
    if (!user?.id || targetId === user.id) return;
    setFriendRequestIds(prev => new Set(prev).add(targetId));
    try {
      await supabase.from('friends').insert({ requester_id: user.id, addressee_id: targetId, status: 'pending' });
      toast({ title: 'Friend request sent' });
    } catch (e: any) {
      if (e?.code !== '23505') {
        setFriendRequestIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
        toast({ title: 'Could not send request', variant: 'destructive' });
      } else {
        toast({ title: 'Request already pending' });
      }
    }
  };

  const removeHistoryItem = (item: string) => {
    searchService.removeSearchHistoryItem(item);
    setSearchHistory(searchService.getSearchHistory());
  };
  const clearHistory = () => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
  };

  if (!isOpen) return null;

  // -------- Sub-renderers --------
  const PersonRow = ({ r }: { r: SearchResult }) => {
    const verified = r.data?.is_verified;
    const targetId = r.data?.id || r.id;
    const isFollowing = followingIds.has(targetId);
    const sent = friendRequestIds.has(targetId);
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
        <button onClick={() => goToProfile(r)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={r.image} />
            <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground truncate">{r.title}</span>
              {verified && <VerifiedBadge className="w-4 h-4 flex-shrink-0" />}
            </div>
            {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
          </div>
        </button>
        {targetId !== user?.id && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant={isFollowing ? 'secondary' : 'default'} className="h-8 px-3 text-xs" onClick={() => handleFollow(targetId)}>
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={sent} onClick={() => handleAddFriend(targetId)} aria-label="Add friend">
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const PostRow = ({ r }: { r: SearchResult }) => (
    <Card className="cursor-pointer hover:bg-accent transition-colors overflow-hidden" onClick={goToPosts}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {r.image ? (
            <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
            {r.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{r.subtitle}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{r.data?.likes_count ?? 0}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{r.data?.comments_count ?? 0}</span>
              <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{r.data?.shares_count ?? 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const GroupRow = ({ r }: { r: SearchResult }) => (
    <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => goToGroup(r)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {r.image ? (
            <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
            {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
          </div>
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs flex-shrink-0" onClick={(e) => { e.stopPropagation(); goToGroup(r); }}>
            Join
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ReelCard = ({ r }: { r: SearchResult }) => (
    <ReelSearchPreview
      videoUrl={r.data?.video_url}
      posterUrl={r.image}
      title={r.title}
      likes={r.data?.likes_count}
      comments={r.data?.comments_count}
      onClick={goToReels}
    />
  );

  const ImageTile = ({ r }: { r: SearchResult }) => (
    <button onClick={() => openImage(r.image)} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
      {r.image ? (
        <img src={r.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>
      )}
    </button>
  );

  const SectionHeader = ({ title, onMore }: { title: string; onMore?: () => void }) => (
    <div className="flex items-center justify-between px-1 mb-2 mt-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {onMore && (
        <button onClick={onMore} className="text-xs font-medium text-primary flex items-center gap-0.5 hover:underline">
          More <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const renderAll = () => {
    const ppl = grouped.people.slice(0, 5);
    const psts = grouped.post.slice(0, 5);
    const grps = grouped.group.slice(0, 5);
    const rls = grouped.reel.slice(0, 6);
    const imgs = grouped.image.slice(0, 6);
    const empty = !ppl.length && !psts.length && !grps.length && !rls.length && !imgs.length;
    if (empty) return <div className="p-8 text-center"><p className="text-muted-foreground">No results found</p></div>;
    return (
      <div className="p-4 pb-12 space-y-1">
        {ppl.length > 0 && (<>
          <SectionHeader title="People" onMore={ppl.length === 5 ? () => setActiveTab('people') : undefined} />
          <div className="space-y-1">{ppl.map(r => <PersonRow key={`p-${r.id}`} r={r} />)}</div>
        </>)}
        {psts.length > 0 && (<>
          <SectionHeader title="Posts" onMore={psts.length === 5 ? () => setActiveTab('posts') : undefined} />
          <div className="space-y-2">{psts.map(r => <PostRow key={`o-${r.id}`} r={r} />)}</div>
        </>)}
        {grps.length > 0 && (<>
          <SectionHeader title="Groups" onMore={grps.length === 5 ? () => setActiveTab('groups') : undefined} />
          <div className="space-y-2">{grps.map(r => <GroupRow key={`g-${r.id}`} r={r} />)}</div>
        </>)}
        {rls.length > 0 && (<>
          <SectionHeader title="Reels" onMore={rls.length === 6 ? () => setActiveTab('reels') : undefined} />
          <div className="grid grid-cols-3 gap-2">{rls.map(r => <ReelCard key={`r-${r.id}`} r={r} />)}</div>
        </>)}
        {imgs.length > 0 && (<>
          <SectionHeader title="Images" onMore={imgs.length === 6 ? () => setActiveTab('images') : undefined} />
          <div className="grid grid-cols-3 gap-2">{imgs.map(r => <ImageTile key={`i-${r.id}`} r={r} />)}</div>
        </>)}
      </div>
    );
  };

  const renderTab = () => {
    if (activeTab === 'all') return renderAll();
    if (activeTab === 'people') {
      const list = grouped.people;
      if (!list.length) return <div className="p-8 text-center text-muted-foreground">No people found</div>;
      return <div className="p-4 space-y-1">{list.map(r => <PersonRow key={r.id} r={r} />)}</div>;
    }
    if (activeTab === 'posts') {
      const list = grouped.post;
      if (!list.length) return <div className="p-8 text-center text-muted-foreground">No posts found</div>;
      return <div className="p-4 space-y-2">{list.map(r => <PostRow key={r.id} r={r} />)}</div>;
    }
    if (activeTab === 'images') {
      const list = grouped.image;
      if (!list.length) return <div className="p-8 text-center text-muted-foreground">No images found</div>;
      return <div className="p-4 grid grid-cols-3 gap-2">{list.map(r => <ImageTile key={r.id} r={r} />)}</div>;
    }
    if (activeTab === 'groups') {
      const list = grouped.group;
      if (!list.length) return <div className="p-8 text-center text-muted-foreground">No groups found</div>;
      return <div className="p-4 space-y-2">{list.map(r => <GroupRow key={r.id} r={r} />)}</div>;
    }
    if (activeTab === 'reels') {
      const list = grouped.reel;
      if (!list.length) return <div className="p-8 text-center text-muted-foreground">No reels found</div>;
      return <div className="p-4 grid grid-cols-2 gap-2">{list.map(r => <ReelCard key={r.id} r={r} />)}</div>;
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
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
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setQuery('')}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b px-2 overflow-x-auto no-scrollbar">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto touch-pan-y min-h-0" style={{ WebkitOverflowScrolling: 'touch' as any, touchAction: 'pan-y', overscrollBehavior: 'contain' }}>
            {!query.trim() ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Recent Searches</h3>
                  {searchHistory.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3 mr-1" /> Clear all
                    </Button>
                  )}
                </div>
                {searchHistory.length > 0 ? (
                  <div className="space-y-1">
                    {searchHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Button variant="ghost" className="flex-1 justify-start min-w-0" onClick={() => setQuery(item)}>
                          <Clock className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{item}</span>
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${item}`} className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeHistoryItem(item); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent searches</p>
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
            ) : (
              renderTab()
            )}
            {!isOnline && (
              <p className="text-xs text-muted-foreground text-center pb-6">Showing cached results. Connect to see more.</p>
            )}
          </div>
        </Tabs>
      </div>

      <ImageModal src={imageModalSrc} alt="Search result" isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} />
    </div>
  );
};

export default GlobalSearch;
