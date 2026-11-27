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
import { User } from '@/types';
import './social-glass.css';

const FriendsSuggestionCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allUsers = await dataService.searchUsers('');
      const friends = await dataService.getFriends();
      const friendIds = new Set<string>();

      friends.forEach(friend => {
        if (friend.requester.id === user.id) friendIds.add(friend.addressee.id);
        else friendIds.add(friend.requester.id);
      });

      const filteredUsers = allUsers.filter(u => u.id !== user.id && !friendIds.has(u.id));
      const suggestionsList = filteredUsers.sort(() => Math.random() - 0.5).slice(0, 10);
      setSuggestions(suggestionsList);

      const states: Record<string, boolean> = {};
      for (const suggestion of suggestionsList) {
        states[suggestion.id] = await dataService.checkIfFollowing(suggestion.id);
      }
      setFollowingStates(states);
    } catch (error) {
      console.error('Error loading friend suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await ProfileService.unfollowUser(userId);
        setFollowingStates(prev => ({ ...prev, [userId]: false }));
        toast({ title: 'Unfollowed', description: 'You are no longer following this user' });
      } else {
        await ProfileService.followUser(userId);
        setFollowingStates(prev => ({ ...prev, [userId]: true }));
        toast({ title: 'Following', description: 'You are now following this user!' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'default' });
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await dataService.sendFriendRequest(userId);
      toast({ title: 'Success', description: 'Friend request sent!' });
      setSuggestions(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'Error', description: 'Failed to send friend request', variant: 'default' });
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="mb-6 w-full overflow-hidden rounded-[2rem] border-0 bg-card/55 shadow-xl shadow-primary/[0.04] backdrop-blur-2xl">
      <CardHeader className="pb-2 pt-5 sm:px-6">
        <CardTitle className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          People You May Know
        </CardTitle>
        <p className="text-sm text-muted-foreground">Find new people to connect with</p>
      </CardHeader>
      <CardContent className="p-4 pt-3 sm:px-6 sm:pb-6">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
            {suggestions.map((suggestion, index) => (
              <article
                key={suggestion.id}
                className="group w-52 flex-shrink-0 rounded-[1.75rem] bg-background/45 p-4 text-center shadow-lg shadow-primary/[0.035] backdrop-blur-2xl transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-1 hover:bg-background/65 hover:shadow-xl hover:shadow-primary/[0.08] motion-reduce:transition-none sm:w-56"
                style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${suggestion.username || suggestion.id}`)}
                  className="mb-3 block w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`View ${suggestion.name}'s profile`}
                >
                  <Avatar className="mx-auto h-16 w-16 shadow-md ring-4 ring-primary/10 transition-transform duration-300 group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
                    <AvatarImage src={suggestion.avatar} />
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {suggestion.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <button
                  type="button"
                  className="max-w-full truncate rounded-md text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={() => navigate(`/profile/${suggestion.username || suggestion.id}`)}
                >
                  {suggestion.name}
                </button>
                <p className="mb-4 mt-1 truncate text-xs text-muted-foreground">@{suggestion.username || 'user'}</p>
                <div className="space-y-2">
                  <Button
                    variant={followingStates[suggestion.id] ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => handleFollowToggle(suggestion.id, !!followingStates[suggestion.id])}
                    className="h-10 w-full rounded-full px-4 text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.03] active:scale-95 motion-reduce:transform-none"
                  >
                    <Heart className={`mr-1.5 h-4 w-4 ${followingStates[suggestion.id] ? 'fill-current' : ''}`} />
                    {followingStates[suggestion.id] ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddFriend(suggestion.id)}
                    className="h-10 w-full rounded-full bg-primary/10 px-4 text-xs font-semibold text-primary shadow-none transition-all duration-200 hover:scale-[1.03] hover:bg-primary/15 active:scale-95 motion-reduce:transform-none"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Add friend
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsSuggestionCard;
