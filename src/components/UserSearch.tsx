
import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dataService } from '@/services/dataService';
import { User, Friend } from '@/types';
import { useToast } from '@/hooks/use-toast';

const UserSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const loadFriends = async () => {
    try {
      const friendsData = await dataService.getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    try {
      const results = await dataService.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await dataService.sendFriendRequest(userId);
      toast({
        title: "Success",
        description: "Friend request sent!"
      });
      loadFriends();
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

  const getFriendStatus = (userId: string) => {
    const friend = friends.find(f => 
      f.requesterId === userId || f.addresseeId === userId
    );
    return friend ? friend.status : null;
  };

  const isPendingRequest = (userId: string) => {
    return friends.find(f => 
      f.addresseeId === userId && f.status === 'pending'
    );
  };

  const isIncomingRequest = (userId: string) => {
    return friends.find(f => 
      f.requesterId === userId && f.status === 'pending'
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search users by name, username, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Search Results</h3>
          {searchResults.map((user) => {
            const friendStatus = getFriendStatus(user.id);
            const pendingRequest = isPendingRequest(user.id);
            const incomingRequest = isIncomingRequest(user.id);

            return (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {friendStatus === 'accepted' && (
                    <span className="text-sm text-green-600 font-medium">Friends</span>
                  )}
                  
                  {pendingRequest && (
                    <span className="text-sm text-yellow-600 font-medium">Request Sent</span>
                  )}
                  
                  {incomingRequest && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => acceptFriendRequest(incomingRequest.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {!friendStatus && !pendingRequest && !incomingRequest && (
                    <Button
                      size="sm"
                      onClick={() => sendFriendRequest(user.id)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Friend
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {friends.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Your Friends</h3>
          {friends
            .filter(f => f.status === 'accepted')
            .map((friend) => {
              const friendUser = friend.requesterId !== friend.addresseeId 
                ? friend.addressee 
                : friend.requester;
              
              return (
                <div key={friend.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Avatar>
                    <AvatarImage src={friendUser.avatar} />
                    <AvatarFallback>{friendUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friendUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{friendUser.username}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {friends.filter(f => f.status === 'pending').length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Pending Requests</h3>
          {friends
            .filter(f => f.status === 'pending')
            .map((friend) => {
              const isIncoming = friend.requesterId !== friend.addresseeId;
              const friendUser = isIncoming ? friend.requester : friend.addressee;
              
              return (
                <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={friendUser.avatar} />
                      <AvatarFallback>{friendUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friendUser.name}</p>
                      <p className="text-sm text-muted-foreground">@{friendUser.username}</p>
                    </div>
                  </div>

                  {isIncoming && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => acceptFriendRequest(friend.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
