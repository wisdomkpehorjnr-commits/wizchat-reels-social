import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MoreVertical, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileService } from '@/services/profileService';
import { useToast } from '@/hooks/use-toast';

interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
}

const FollowersFollowing = () => {
  const { userId, tab } = useParams<{ userId: string; tab: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || 'followers');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [profileName, setProfileName] = useState('');

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    loadData();
  }, [targetUserId]);

  const loadData = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      // Get profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', targetUserId)
        .single();
      if (profile) setProfileName(profile.name);

      // Get followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, name, username, avatar, bio)')
        .eq('following_id', targetUserId) as any;

      if (followersData) {
        setFollowers(followersData.map((f: any) => ({
          id: f.profiles.id,
          name: f.profiles.name,
          username: f.profiles.username,
          avatar: f.profiles.avatar,
          bio: f.profiles.bio,
        })));
      }

      // Get following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, name, username, avatar, bio)')
        .eq('follower_id', targetUserId) as any;

      if (followingData) {
        setFollowing(followingData.map((f: any) => ({
          id: f.profiles.id,
          name: f.profiles.name,
          username: f.profiles.username,
          avatar: f.profiles.avatar,
          bio: f.profiles.bio,
        })));
      }

      // Load current user's follow states
      if (user) {
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        if (myFollows) {
          const states: Record<string, boolean> = {};
          myFollows.forEach(f => { states[f.following_id] = true; });
          setFollowingStates(states);
        }
      }
    } catch (err) {
      console.error('Error loading follow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId: string) => {
    const isCurrentlyFollowing = followingStates[targetId];
    // Optimistic
    setFollowingStates(prev => ({ ...prev, [targetId]: !isCurrentlyFollowing }));
    try {
      if (isCurrentlyFollowing) {
        await ProfileService.unfollowUser(targetId);
      } else {
        await ProfileService.followUser(targetId);
      }
    } catch {
      setFollowingStates(prev => ({ ...prev, [targetId]: isCurrentlyFollowing }));
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'destructive' });
    }
  };

  const filterUsers = (users: FollowUser[]) => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term));
  };

  const renderUserCard = (person: FollowUser) => {
    const isMe = person.id === user?.id;
    const isFollowingThem = followingStates[person.id];

    return (
      <div
        key={person.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-accent/50 transition-colors animate-in fade-in duration-200"
      >
        <Avatar
          className="w-12 h-12 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
          onClick={() => navigate(`/profile/${person.id}`)}
        >
          <AvatarImage src={person.avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {person.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${person.id}`)}>
          <p className="font-semibold text-sm text-foreground truncate">{person.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{person.username}</p>
          {person.bio && (
            <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{person.bio}</p>
          )}
        </div>

        {!isMe && (
          <Button
            size="sm"
            variant={isFollowingThem ? 'secondary' : 'default'}
            onClick={() => handleFollowToggle(person.id)}
            className="text-xs h-8 px-3 flex-shrink-0 transition-all duration-200"
          >
            {isFollowingThem ? '✓ Following' : 'Follow'}
          </Button>
        )}
      </div>
    );
  };

  const EmptyState = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <UserPlus className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">No {type} yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {type === 'followers' ? 'Share your profile to get followers' : 'Start following people'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="font-semibold text-foreground text-sm">{profileName || 'User'}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="followers"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-sm"
            >
              Followers • {followers.length}
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-sm"
            >
              Following • {following.length}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : activeTab === 'followers' ? (
          filterUsers(followers).length > 0 ? (
            filterUsers(followers).map(renderUserCard)
          ) : (
            <EmptyState type="followers" />
          )
        ) : (
          filterUsers(following).length > 0 ? (
            filterUsers(following).map(renderUserCard)
          ) : (
            <EmptyState type="following" />
          )
        )}
      </div>
    </div>
  );
};

export default FollowersFollowing;
