import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import VerifiedBadge from './VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, UserMinus, MoreHorizontal, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';

interface ClickableUserInfoProps {
  user: User | any;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: string;
  className?: string;
}

const ClickableUserInfo = ({ 
  user, 
  showAvatar = true, 
  showName = true, 
  avatarSize = "w-8 h-8",
  className = "" 
}: ClickableUserInfoProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [showPopup, setShowPopup] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRelationId, setFriendRelationId] = useState<string | null>(null);
  const isOnline = useOnlineStatus(user?.id);
  const isVerified = (user as any)?.is_verified || false;
  const identifier = user?.username || user?.id;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.id) return;

    const isOwnProfile = currentUser && (
      user.id === currentUser.id ||
      user.username === currentUser.username
    );

    // Primary action: navigate to the user's profile (always works for others)
    if (!isOwnProfile) {
      navigate(`/profile/${identifier}`);
    }
  };

  const handleViewProfile = () => {
    setShowPopup(false);
    navigate(`/profile/${identifier}`);
  };

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const following = await dataService.checkIfFollowing(user.id);
        setIsFollowing(following);

        const friends = await dataService.getFriends().catch(() => []);
        const found = friends.find((f: any) => {
          const other = f.requester.id === currentUser?.id ? f.addressee : f.requester;
          return other && other.id === user.id;
        });
        setIsFriend(!!found);
        setFriendRelationId(found ? found.id : null);
      } catch (err) {
        // ignore
      }
    })();
  }, [user?.id, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!user?.id) return;
    try {
      if (isFollowing) {
        await ProfileService.unfollowUser(user.id);
        setIsFollowing(false);
        toast({ title: 'Unfollowed', description: `You unfollowed ${user.name || 'this user'}` });
      } else {
        await ProfileService.followUser(user.id);
        setIsFollowing(true);
        toast({ title: 'Following', description: `You are now following ${user.name || 'this user'}` });
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'destructive' });
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user?.id) return;
    try {
      if (isFriend) {
        // Use the friend relation id if available
        if (!friendRelationId) throw new Error('No friend relation id');
        await dataService.unfriend(friendRelationId).catch(() => { throw new Error('Failed to unfriend'); });
        setIsFriend(false);
        setFriendRelationId(null);
        toast({ title: 'Unfriended', description: `${user.name || 'User'} removed from friends` });
      } else {
        await dataService.sendFriendRequest(user.id);
        setIsFriend(true);
        toast({ title: 'Request Sent', description: 'Friend request sent' });
      }
    } catch (err) {
      console.error('Friend request error:', err);
      toast({ title: 'Error', description: 'Failed to update friend status', variant: 'destructive' });
    }
  };

  const handleMessageUser = async () => {
    if (!user?.id) return;
    setShowPopup(false);
    try {
      const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', { p_other_user_id: user.id });
      if (error) throw error;
      navigate('/chat');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openChatWithUser', { detail: { userId: user.id, chatId } }));
      }, 300);
    } catch (err) {
      console.error('Error opening chat:', err);
      toast({ title: 'Error', description: 'Failed to open chat', variant: 'destructive' });
    }
  };
  
  if (!user) return null;
  
  const isOwnProfile = currentUser && (user.id === currentUser.id || user.username === currentUser.username);
  
  return (
    <>
      <div 
        onClick={handleClick}
        className={`flex items-center space-x-2 transition-opacity hover:opacity-80 cursor-pointer ${className}`}
      >
        {showAvatar && (
          <div className="relative">
            <Avatar className={`${avatarSize} ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
              <AvatarImage src={user.avatar || user.photoURL} />
              <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            {isVerified && (
              <span className="absolute -bottom-1 -right-1">
                <VerifiedBadge className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
        {showName && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground hover:text-primary transition-colors">
              {user.name || user.email || 'Unknown User'}
            </span>
            {isVerified && (
              <VerifiedBadge className="ml-1 w-4 h-4 align-middle" />
            )}
          </div>
        )}
        {/* action trigger */}
        {!isOwnProfile && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowPopup(true); }}
            aria-label="Actions"
            className="ml-2 p-1 rounded-full hover:bg-muted/10"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Profile action popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-[280px] rounded-2xl p-0 overflow-hidden border border-border bg-card shadow-xl [&>button]:hidden">
          <div className="flex flex-col items-center pt-6 pb-2 px-4">
            <Avatar className="w-16 h-16 mb-3">
              <AvatarImage src={user.avatar || user.photoURL} />
              <AvatarFallback className="text-lg">{user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground text-base">{user.name || 'Unknown'}</p>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
          </div>
          <div className="px-4 pb-3">
            <div className="flex justify-around mb-3">
              <div className="text-center">
                <p className="text-lg font-bold">{user?.followerCount || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user?.followingCount || 0}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full rounded-xl backdrop-blur-sm bg-white/10 border-white/20"
                onClick={handleToggleFollow}
              >
                {isFollowing ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>

              <Button
                className="w-full rounded-xl bg-green-600 text-white"
                onClick={handleMessageUser}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>

              <Button
                variant="outline"
                className="w-full rounded-xl backdrop-blur-sm bg-white/10 border-white/20"
                onClick={handleSendFriendRequest}
              >
                {isFriend ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isFriend ? 'Unfriend' : 'Add Friend'}
              </Button>

              <Button 
                className="w-full rounded-xl" 
                onClick={handleViewProfile}
              >
                <Users className="w-4 h-4 mr-2" />
                View Profile
              </Button>

              <Button 
                variant="ghost" 
                className="w-full rounded-xl text-muted-foreground" 
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClickableUserInfo;
