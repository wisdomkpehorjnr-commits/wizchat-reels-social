import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { User, Friend } from '@/types';

const FriendsSuggestionCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all users (we'll filter out friends)
      const allUsers = await dataService.searchUsers('');
      
      // Get current user's friends
      const friends = await dataService.getFriends();
      const friendIds = new Set<string>();
      
      friends.forEach(friend => {
        if (friend.requester.id === user.id) {
          friendIds.add(friend.addressee.id);
        } else {
          friendIds.add(friend.requester.id);
        }
      });

      // Filter out current user and existing friends
      const filteredUsers = allUsers.filter(u => 
        u.id !== user.id && !friendIds.has(u.id)
      );

      // Shuffle and take first 10 suggestions
      const shuffled = filteredUsers.sort(() => Math.random() - 0.5);
      const suggestionsList = shuffled.slice(0, 10);
      
      setSuggestions(suggestionsList);

      // Load following states
      const states: Record<string, boolean> = {};
      for (const suggestion of suggestionsList) {
        const isFollowing = await dataService.checkIfFollowing(suggestion.id);
        states[suggestion.id] = isFollowing;
      }
      setFollowingStates(states);
    } catch (error) {
      console.error('Error loading friend suggestions:', error);
      // Removed user-facing toast for failed friend suggestions per request
    } finally {
      setLoading(false);
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

  const handleAddFriend = async (userId: string) => {
    try {
      await dataService.sendFriendRequest(userId);
      toast({
        title: "Success",
        description: "Friend request sent!"
      });
      // Remove from suggestions
      setSuggestions(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  if (loading || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="w-full border-2 border-green-500 bg-background mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground">
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 pb-2" style={{ minWidth: 'max-content' }}>
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex-shrink-0 w-48 border border-green-500 rounded-lg bg-background hover:shadow-md transition-shadow"
              >
                <div className="p-4 text-center">
                  <div 
                    className="cursor-pointer mb-3"
                    onClick={() => navigate(`/profile/${suggestion.username || suggestion.id}`)}
                  >
                    <Avatar className="w-16 h-16 mx-auto">
                      <AvatarImage src={suggestion.avatar} />
                      <AvatarFallback className="text-lg bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                        {suggestion.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <h3 
                    className="font-medium text-sm text-foreground mb-1 hover:text-green-500 cursor-pointer truncate"
                    onClick={() => navigate(`/profile/${suggestion.username || suggestion.id}`)}
                  >
                    {suggestion.name}
                  </h3>
                  
                  <p className="text-xs text-muted-foreground mb-3 truncate">
                    @{suggestion.username || 'user'}
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      variant={followingStates[suggestion.id] ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleFollowToggle(suggestion.id, followingStates[suggestion.id])}
                      className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Heart className={`w-3 h-3 mr-1 ${followingStates[suggestion.id] ? 'fill-current' : ''}`} />
                      {followingStates[suggestion.id] ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFriend(suggestion.id)}
                      className="w-full h-7 text-xs border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Add Friend
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsSuggestionCard;

