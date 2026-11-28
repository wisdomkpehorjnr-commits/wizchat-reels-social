import VerifiedBadge from '@/components/VerifiedBadge';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage as RawAvatarImage } from '@/components/ui/avatar';
import { useImageCache } from '@/hooks/useImageCache';
const AvatarImage = ({ src }: { src?: string }) => { const { cachedUrl } = useImageCache(src || undefined); return <RawAvatarImage src={cachedUrl || src} />; };
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  UserPlus, 
  UserMinus, 
  Users, 
  Clock,
  Check,
  X,
  UserCheck,
  MessageCircle,
  WifiOff
} from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCache } from '@/hooks/useCache';
import { useTabCache } from '@/hooks/useTabCache';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';

const FRIENDS_CACHE_KEY = 'wizchat_friends_cache';

const friendsStore = { friends: [] as Friend[], lastFetchTime: 0 };

const saveFriendsToCache = (friends: Friend[]) => {
  try {
    localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({ data: friends, timestamp: Date.now() }));
    friendsStore.friends = friends;
    friendsStore.lastFetchTime = Date.now();
  } catch {}
};

const Friends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Synchronously hydrate from localStorage so revisits render instantly (no skeleton flash)
  const localStorageFriends = useMemo((): Friend[] => {
    try {
      const raw = localStorage.getItem('friends-list');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { data?: Friend[] };
      return Array.isArray(parsed?.data) ? parsed.data : [];
    } catch {
      return [];
    }
  }, []);
  
  // Use persistent tab cache (friends list won't reload on tab revisit)
  const { cachedData: tabCachedFriends, cacheData: cacheTabFriends, cacheStatus } = useTabCache({
    tabId: 'friends-tab',
    enabled: true,
    ttl: 30 * 60 * 1000, // 30 minutes - persist across session
    onStatusChange: (status) => {
      console.debug(`[Friends] Cache status: ${status}`);
    },
  });
  
  const { cachedData: cachedFriends, setCache: setCachedFriends } = useCache<Friend[]>({
    key: 'friends-list',
    // Effectively “forever” for session UX: we only refresh on explicit user actions
    ttl: 365 * 24 * 60 * 60 * 1000,
  });
  
  const [friends, setFriends] = useState<Friend[]>(tabCachedFriends || cachedFriends || localStorageFriends || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(!(tabCachedFriends || cachedFriends || localStorageFriends));
  const [error, setError] = useState<Error | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem('wizchat_follow_states');
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [confirmRemove, setConfirmRemove] = useState<{ friendId: string; friendUser: User } | null>(null);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // When async caches hydrate, reflect them immediately
  useEffect(() => {
    if (tabCachedFriends && tabCachedFriends.length > 0) {
      setFriends(tabCachedFriends);
      setLoading(false);
    }
  }, [tabCachedFriends]);

  useEffect(() => {
    if (cachedFriends && cachedFriends.length > 0) {
      setFriends(cachedFriends);
      setLoading(false);
    }
  }, [cachedFriends]);

  useEffect(() => {
    if (!user || hasLoadedRef.current) return;

    // Hard rule: do NOT refetch on revisit if we already have any cached friends.
    if ((tabCachedFriends && tabCachedFriends.length > 0) || (cachedFriends && cachedFriends.length > 0) || localStorageFriends.length > 0) {
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    loadFriends(false);
    hasLoadedRef.current = true;
  }, [user]);

  // Load follow states from DB on mount
  useEffect(() => {
    if (!user) return;
    const loadFollowStates = async () => {
      try {
        const { data } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        if (data) {
          const states: Record<string, boolean> = {};
          data.forEach(f => { states[f.following_id] = true; });
          setFollowingStates(states);
          try { localStorage.setItem('wizchat_follow_states', JSON.stringify(states)); } catch {}
        }
      } catch {}
    };
    loadFollowStates();
  }, [user]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadFriends = async (silent = false) => {
    if (!user) return;
    
    try {
      if (!silent) {
        setLoading(true);
      }
      
      setError(null);
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      saveFriendsToCache(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
      if (!silent && friendsStore.friends.length === 0 && navigator.onLine) {
        const err = error instanceof Error ? error : new Error('Failed to load friends');
        setError(err);
        toast({
          title: "Error",
          description: "Failed to load friends",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearchLoading(true);
      const users = await dataService.searchUsers(searchTerm);
      // Filter out current user and existing friends
      const filteredUsers = users.filter(u => 
        u.id !== user?.id && 
        !friends.some(f => f.requester.id === u.id || f.addressee.id === u.id)
      );
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      if (!navigator.onLine) return;
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await dataService.sendFriendRequest(userId);
      toast({
        title: "Success",
        description: "Friend request sent!"
      });
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (friendId: string) => {
    try {
      await dataService.acceptFriendRequest(friendId);
      toast({
        title: "Success",
        description: "Friend request accepted!"
      });
      loadFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const unfriendUser = async (friendId: string) => {
    try {
      await dataService.unfriend(friendId);
      toast({
        title: "Success",
        description: "User unfriended"
      });
      loadFriends();
    } catch (error) {
      console.error('Error unfriending user:', error);
      toast({
        title: "Error",
        description: "Failed to unfriend user",
        variant: "destructive"
      });
    }
  };

  const handleFollowToggle = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (typeof currentlyFollowing !== 'boolean') {
        currentlyFollowing = false;
      }
      // Optimistic update
      const newState = !currentlyFollowing;
      setFollowingStates(prev => {
        const updated = { ...prev, [userId]: newState };
        try { localStorage.setItem('wizchat_follow_states', JSON.stringify(updated)); } catch {}
        return updated;
      });

      if (currentlyFollowing) {
        await ProfileService.unfollowUser(userId);
        toast({ title: "Unfollowed", description: "You are no longer following this user" });
      } else {
        await ProfileService.followUser(userId);
        toast({ title: "Following", description: "You are now following this user!" });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert on error
      setFollowingStates(prev => {
        const reverted = { ...prev, [userId]: currentlyFollowing };
        try { localStorage.setItem('wizchat_follow_states', JSON.stringify(reverted)); } catch {}
        return reverted;
      });
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    }
  };

  const handleRemoveFriend = async (friendId: string, friendUser: User) => {
    try {
      // Unfriend
      await dataService.unfriend(friendId);
      // Remove from chat list
      const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
      if (!hiddenUsers.includes(friendUser.id)) {
        hiddenUsers.push(friendUser.id);
        localStorage.setItem('hidden-chat-users', JSON.stringify(hiddenUsers));
      }
      // Unfollow if following
      if (followingStates[friendUser.id]) {
        try { await ProfileService.unfollowUser(friendUser.id); } catch {}
        setFollowingStates(prev => {
          const updated = { ...prev, [friendUser.id]: false };
          try { localStorage.setItem('wizchat_follow_states', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      toast({ title: "Removed", description: `${friendUser.name} has been removed from your friends and chat list.` });
      loadFriends();
      window.dispatchEvent(new CustomEvent('chatListUpdate'));
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({ title: "Error", description: "Failed to remove user", variant: "destructive" });
    }
    setConfirmRemove(null);
  };


  const openChat = async (friendUser: User) => {
    if (!user?.id || openingChatId) return;
    setOpeningChatId(friendUser.id);
    try {
      const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: friendUser.id
      });
      if (error) throw error;
      navigate('/chat');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openChatWithUser', {
          detail: { userId: friendUser.id, chatId }
        }));
      }, 300);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast({ title: "Error", description: "Couldn't open the chat. Please try again.", variant: "destructive" });
    } finally {
      setOpeningChatId(null);
    }
  };

  // Filter friends by status
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => 
    f.status === 'pending' && f.addressee.id === user?.id
  );
  const sentRequests = friends.filter(f => 
    f.status === 'pending' && f.requester.id === user?.id
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="home-instagram-title text-2xl text-foreground flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  Friends
                </CardTitle>
                
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-foreground border-2 green-border"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Search Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((searchUser) => (
                      <Card key={searchUser.id} className="border green-border hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Link to={`/profile/${searchUser.username}`}>
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={searchUser.avatar} />
                                  <AvatarFallback className="text-xs">{searchUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link to={`/profile/${searchUser.username}`}>
                                  <h4 className="font-medium text-sm text-foreground hover:text-primary truncate">
                                    {searchUser.name}{((searchUser) as any)?.is_verified && <VerifiedBadge size={15} className="ml-1 align-middle" />}
                                  </h4>
                                </Link>
                                <p className="text-xs text-muted-foreground truncate">@{searchUser.username}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => sendFriendRequest(searchUser.id)}
                              size="sm"
                              className="h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Friends ({acceptedFriends.length})</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Requests ({pendingRequests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>Sent ({sentRequests.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-6">
              {loading && !isOffline ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-sm sm:gap-4 sm:p-4">
                      <Skeleton className="h-14 w-14 flex-shrink-0 rounded-full sm:h-16 sm:w-16" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="hidden h-9 w-28 rounded-full sm:block" />
                      <Skeleton className="hidden h-9 w-9 rounded-full sm:block" />
                      <Skeleton className="hidden h-9 w-24 rounded-full sm:block" />
                    </div>
                  ))}
                </div>
              ) : acceptedFriends.length > 0 ? (
                <div className="space-y-3">
                  {acceptedFriends.map((friend) => {
                    const friendUser = friend.requester.id === user?.id ? friend.addressee : friend.requester;
                    const isFollowing = Boolean(followingStates[friendUser.id]);
                    return (
                      <div
                        key={friend.id}
                        className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 rounded-3xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_auto] sm:gap-x-4 sm:p-4"
                      >
                        <Link
                          to={`/profile/${friendUser.username}`}
                          className="row-span-2 sm:row-span-1"
                          aria-label={`View ${friendUser.name}'s profile`}
                        >
                          <Avatar className="h-14 w-14 ring-2 ring-primary/15 sm:h-16 sm:w-16">
                            <AvatarImage src={friendUser.avatar} />
                            <AvatarFallback className="text-base font-semibold">
                              {friendUser.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="min-w-0">
                          <Link to={`/profile/${friendUser.username}`} className="block">
                            <h3 className="flex items-center text-[15px] font-bold text-foreground hover:text-primary">
                              <span className="truncate">{friendUser.name}</span>
                              {((friendUser) as any)?.is_verified && <VerifiedBadge size={15} className="ml-1 flex-shrink-0" />}
                            </h3>
                          </Link>
                          <p className="truncate text-sm text-muted-foreground">@{friendUser.username}</p>
                        </div>

                        <div className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:row-start-1">
                          <Button
                            variant={isFollowing ? "secondary" : "default"}
                            size="sm"
                            onClick={() => handleFollowToggle(friendUser.id, isFollowing)}
                            className={`h-9 rounded-full px-4 text-[13px] font-bold shadow-none ${
                              isFollowing
                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            {isFollowing ? <UserCheck className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChat(friendUser)}
                            disabled={openingChatId === friendUser.id}
                            aria-label={`Message ${friendUser.name}`}
                            title="Message"
                            className="h-9 w-9 rounded-full border-border p-0"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemove({ friendId: friend.id, friendUser })}
                            aria-label={`Remove ${friendUser.name}`}
                            title="Remove"
                            className="h-9 w-9 rounded-full bg-destructive/10 p-0 text-[13px] font-bold text-destructive shadow-none hover:bg-destructive hover:text-destructive-foreground sm:w-auto sm:px-4"
                          >
                            <UserMinus className="h-4 w-4" />
                            <span className="ml-1.5 hidden sm:inline">Remove</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-2 green-border">
                  <CardContent className="p-8 text-center">
                    {isOffline ? (
                      <>
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted/30 backdrop-blur-xl flex items-center justify-center">
                          <Users className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Your friends will appear here</h3>
                        <p className="text-muted-foreground">
                          They'll load as soon as you're back online
                        </p>
                      </>
                    ) : (
                      <>
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                        <p className="text-muted-foreground">
                          Search for people to add as friends and start connecting!
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              {pendingRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border green-border hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Link to={`/profile/${request.requester.username}`}>
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={request.requester.avatar} />
                                <AvatarFallback className="text-xs">{request.requester.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link to={`/profile/${request.requester.username}`}>
                                <h4 className="font-medium text-sm text-foreground hover:text-primary truncate">
                                  {request.requester.name}{((request.requester) as any)?.is_verified && <VerifiedBadge size={15} className="ml-1 align-middle" />}
                                </h4>
                              </Link>
                              <p className="text-xs text-muted-foreground truncate">@{request.requester.username}</p>
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <Button
                              onClick={() => acceptFriendRequest(request.id)}
                              size="sm"
                              className="h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 green-border">
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">
                      You don't have any pending friend requests at the moment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-6">
              {sentRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sentRequests.map((request) => (
                    <Card key={request.id} className="border green-border hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Link to={`/profile/${request.addressee.username}`}>
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={request.addressee.avatar} />
                                <AvatarFallback className="text-xs">{request.addressee.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link to={`/profile/${request.addressee.username}`}>
                                <h4 className="font-medium text-sm text-foreground hover:text-primary truncate">
                                  {request.addressee.name}{((request.addressee) as any)?.is_verified && <VerifiedBadge size={15} className="ml-1 align-middle" />}
                                </h4>
                              </Link>
                              <p className="text-xs text-muted-foreground truncate">@{request.addressee.username}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 green-border">
                  <CardContent className="p-8 text-center">
                    <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                    <p className="text-muted-foreground">
                      You haven't sent any friend requests yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmationDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="Remove User"
        description={`Do you want to remove ${confirmRemove?.friendUser?.name || 'this user'} from your Chat list and Friends?`}
        confirmText="Sure"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (confirmRemove) {
            handleRemoveFriend(confirmRemove.friendId, confirmRemove.friendUser);
          }
        }}
      />
    </Layout>
  );
};

export default Friends;
