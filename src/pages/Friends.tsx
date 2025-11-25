import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  UserPlus, 
  UserMinus, 
  MessageCircle, 
  Users, 
  Clock,
  Check,
  X,
  Heart
} from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCache } from '@/hooks/useCache';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';


const Friends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cachedData: cachedFriends, setCache: setCachedFriends, isStale } = useCache<Friend[]>({ 
    key: 'friends-list',
    ttl: 2 * 60 * 1000 // 2 minutes cache
  });
  
  const [friends, setFriends] = useState<Friend[]>(cachedFriends || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(!cachedFriends);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState<string | null>(null);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  

  useEffect(() => {
    if (user) {
      loadFriends();
    }
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

  const loadFriends = async () => {
    if (!user) return;
    
    try {
      // Show cached data immediately if available
      if (!isStale && cachedFriends) {
        setFriends(cachedFriends);
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      setCachedFriends(userFriends); // Update cache
      
      // Load following states for all friends
      const states: Record<string, boolean> = {};
      for (const friend of userFriends) {
        const friendUser = friend.requester.id === user.id ? friend.addressee : friend.requester;
        const isFollowing = await dataService.checkIfFollowing(friendUser.id);
        states[friendUser.id] = isFollowing;
      }
      setFollowingStates(states);
    } catch (error) {
      console.error('Error loading friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends",
        variant: "destructive"
      });
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
      if (currentlyFollowing) {
        await ProfileService.unfollowUser(userId);
        setFollowingStates(prev => ({ ...prev, [userId]: false }));
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user"
        });
      } else {
        await ProfileService.followUser(userId);
        setFollowingStates(prev => ({ ...prev, [userId]: true }));
        toast({
          title: "Following",
          description: "You are now following this user!"
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      });
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
              <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Friends
              </CardTitle>
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
                                    {searchUser.name}
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
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[...Array(10)].map((_, i) => (
                    <Card key={i} className="border green-border">
                      <CardContent className="p-3">
                        <Skeleton className="w-12 h-12 rounded-full mx-auto mb-2" />
                        <Skeleton className="w-20 h-3 mx-auto mb-1" />
                        <Skeleton className="w-16 h-2 mx-auto mb-2" />
                        <Skeleton className="w-full h-6 mb-1" />
                        <Skeleton className="w-full h-6" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : acceptedFriends.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {acceptedFriends.map((friend) => {
                    const friendUser = friend.requester.id === user?.id ? friend.addressee : friend.requester;
                    return (
                      <Card key={friend.id} className="border green-border hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                        <CardContent className="p-3 text-center">
                          <Link to={`/profile/${friendUser.username}`}>
                            <Avatar className="w-12 h-12 mx-auto mb-2">
                              <AvatarImage src={friendUser.avatar} />
                              <AvatarFallback className="text-sm">
                                {friendUser.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <Link to={`/profile/${friendUser.username}`}>
                            <h3 className="font-medium text-sm text-foreground mb-1 hover:text-primary truncate">
                              {friendUser.name}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted-foreground mb-2 truncate">@{friendUser.username}</p>
                          
                          <div className="space-y-1.5">
                            <Button
                              variant={followingStates[friendUser.id] ? "secondary" : "default"}
                              size="sm"
                              onClick={() => handleFollowToggle(friendUser.id, followingStates[friendUser.id])}
                              className="w-full h-7 text-xs"
                            >
                              <Heart className={`w-3 h-3 mr-1 ${followingStates[friendUser.id] ? 'fill-current' : ''}`} />
                              {followingStates[friendUser.id] ? 'Following' : 'Follow'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmUnfriend(friend.id)}
                              className="w-full h-7 text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <UserMinus className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-2 green-border">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                    <p className="text-muted-foreground">
                      Search for people to add as friends and start connecting!
                    </p>
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
                                  {request.requester.name}
                                </h4>
                              </Link>
                              <p className="text-xs text-muted-foreground truncate">@{request.requester.username}</p>
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <Button
                              onClick={() => acceptFriendRequest(request.id)}
                              size="sm"
                              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
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
                                  {request.addressee.name}
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
        open={!!confirmUnfriend}
        onOpenChange={(open) => !open && setConfirmUnfriend(null)}
        title="Unfriend User"
        description="Are you sure you want to remove this friend? This action cannot be undone."
        confirmText="Yes, unfriend"
        cancelText="No, cancel"
        variant="destructive"
        onConfirm={() => {
          if (confirmUnfriend) {
            unfriendUser(confirmUnfriend);
            setConfirmUnfriend(null);
          }
        }}
      />
    </Layout>
  );
};

export default Friends;
