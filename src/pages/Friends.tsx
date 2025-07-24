
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Clock, Search } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Friends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchUsers();
    } else {
      setAvailableUsers([]);
    }
  }, [searchTerm]);

  const loadFriends = async () => {
    try {
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
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
    try {
      const users = await dataService.searchUsers(searchTerm);
      // Filter out current user and existing friends
      const filteredUsers = users.filter(u => 
        u.id !== user?.id && 
        !friends.some(f => f.addressee.id === u.id || f.requester.id === u.id)
      );
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await dataService.sendFriendRequest(userId);
      await loadFriends();
      toast({
        title: "Success",
        description: "Friend request sent!"
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      await dataService.acceptFriendRequest(requestId);
      await loadFriends();
      toast({
        title: "Success",
        description: "Friend request accepted!"
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending' && f.addresseeId === user?.id);

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
                  placeholder="Search people..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-foreground border-2 green-border"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="friends" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Friends ({acceptedFriends.length})</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Requests ({pendingRequests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>Discover</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends">
              <Card className="border-2 green-border">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 animate-pulse">
                          <div className="w-12 h-12 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="w-32 h-4 bg-muted rounded" />
                            <div className="w-48 h-3 bg-muted rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : acceptedFriends.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No friends yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Search for people to add as friends
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {acceptedFriends.map((friend) => {
                        const friendData = friend.addresseeId === user?.id ? friend.requester : friend.addressee;
                        return (
                          <div key={friend.id} className="p-4 hover:bg-muted/50">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={friendData.avatar} />
                                <AvatarFallback className="bg-muted text-foreground">
                                  {friendData.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">{friendData.name}</h3>
                                <p className="text-sm text-muted-foreground">@{friendData.username}</p>
                              </div>
                              <Badge variant="secondary">Friends</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card className="border-2 green-border">
                <CardContent className="p-0">
                  {pendingRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending requests</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="p-4 hover:bg-muted/50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={request.requester.avatar} />
                              <AvatarFallback className="bg-muted text-foreground">
                                {request.requester.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{request.requester.name}</h3>
                              <p className="text-sm text-muted-foreground">@{request.requester.username}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequest(request.id)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                Accept
                              </Button>
                              <Button variant="outline" size="sm" className="border-2 green-border">
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discover">
              <Card className="border-2 green-border">
                <CardContent className="p-0">
                  {availableUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No users found' : 'Search for people to add as friends'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableUsers.map((user) => (
                        <div key={user.id} className="p-4 hover:bg-muted/50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-muted text-foreground">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequest(user.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add Friend
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Friends;
