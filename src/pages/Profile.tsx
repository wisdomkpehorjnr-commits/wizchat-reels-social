import { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { Post, SavedPost, Follow } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, UserCircle, WifiOff } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ImageModal from '@/components/ImageModal';
import AvatarStudio from '@/components/AvatarStudio';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import VerificationBadge from '@/components/VerificationBadge';
import LoadingDots from '@/components/LoadingDots';

// =============================================
// PERSISTENT PROFILE CACHE
// =============================================
const PROFILE_CACHE_KEY = 'wizchat_profile_cache';

interface ProfileCache {
  profile: any;
  posts: Post[];
  reels: Post[];
  timestamp: number;
}

const getProfileCache = (userId: string): ProfileCache | null => {
  try {
    const cached = localStorage.getItem(`${PROFILE_CACHE_KEY}_${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
};

const saveProfileCache = (userId: string, data: Partial<ProfileCache>) => {
  try {
    const existing = getProfileCache(userId) || { profile: null, posts: [], reels: [], timestamp: 0 };
    const updated = { ...existing, ...data, timestamp: Date.now() };
    localStorage.setItem(`${PROFILE_CACHE_KEY}_${userId}`, JSON.stringify(updated));
  } catch {}
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userIdentifier } = useParams();

  // Get cached data for instant display
  const targetUserId = userIdentifier || user?.id;
  const cachedProfile = useMemo(() => targetUserId ? getProfileCache(targetUserId) : null, [targetUserId]);

  const [profileUser, setProfileUser] = useState<any>(cachedProfile?.profile || null);
  const [userPosts, setUserPosts] = useState<Post[]>(cachedProfile?.posts || []);
  const [userReels, setUserReels] = useState<Post[]>(cachedProfile?.reels || []);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(!cachedProfile);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Saved item long-press / download
  const [selectedSaved, setSelectedSaved] = useState<SavedPost | null>(null);
  const [showSavedOptions, setShowSavedOptions] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  // Determine if this is the current user's profile
  const isOwnProfile = !userIdentifier || (profileUser && user && profileUser.id === user.id);
  const targetUser = profileUser || (isOffline ? {
    name: user.name || user.email?.split('@')[0] || 'User',
    username: user.username || user.email?.split('@')[0] || 'user',
    avatar: user.avatar || (user as any).photoURL,
    bio: (user as any).bio || '',
    createdAt: (user as any).createdAt || new Date(),
    followerCount: 0,
    followingCount: 0,
    is_verified: false,
    id: user.id,
  } : user);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /** Fetch profile data */
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // If we have cached data, show it immediately and don't show loading
      if (cachedProfile) {
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      setError(null);
      setContentLoading(true);

      try {
        let currentUserId = user.id;
        let currentUser = user;

        if (userIdentifier) {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.eq.${userIdentifier},id.eq.${userIdentifier}`)
            .limit(1);

          if (error) throw error;
          if (!profiles || profiles.length === 0) {
            setError("User not found");
            setLoading(false);
            setContentLoading(false);
            return;
          }

          const foundProfile = profiles[0];
          const foundUser = {
            id: foundProfile.id,
            name: foundProfile.name,
            username: foundProfile.username || `user_${foundProfile.id.slice(0, 8)}`,
            email: foundProfile.email,
            avatar: foundProfile.avatar,
            photoURL: foundProfile.avatar,
            bio: foundProfile.bio,
            location: foundProfile.location,
            website: foundProfile.website,
            birthday: foundProfile.birthday ? new Date(foundProfile.birthday) : undefined,
            gender: foundProfile.gender,
            pronouns: foundProfile.pronouns,
            coverImage: foundProfile.cover_image,
            isPrivate: foundProfile.is_private,
            followerCount: foundProfile.follower_count || 0,
            followingCount: foundProfile.following_count || 0,
            profileViews: foundProfile.profile_views || 0,
            createdAt: new Date(foundProfile.created_at),
            is_verified: foundProfile.is_verified || false
          };
          setProfileUser(foundUser);
          currentUserId = foundUser.id;
          currentUser = foundUser;
          
          // Cache the profile
          saveProfileCache(foundUser.id, { profile: foundUser });
        }

        // Posts & reels
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(p => p.userId === currentUserId);
        const userPostsList = filteredPosts.filter(p => !p.isReel);
        const userReelsList = filteredPosts.filter(p => p.isReel);
        
        setUserPosts(userPostsList);
        setUserReels(userReelsList);
        
        // Cache posts and reels
        saveProfileCache(currentUserId, { posts: userPostsList, reels: userReelsList });

        if (isOwnProfile) {
          const saved = await ProfileService.getSavedPosts().catch(() => []);
          setSavedPosts(saved);
          
          // Load user groups
          try {
            const groups = await dataService.getUserGroups(user.id);
            setUserGroups(groups);
          } catch (err) {
            console.error('Error loading groups:', err);
            setUserGroups([]);
          }
        }

        const [followersList, followingList] = await Promise.all([
          ProfileService.getFollowers(currentUserId).catch(() => []),
          ProfileService.getFollowing(currentUserId).catch(() => [])
        ]);
        setFollowers(followersList);
        setFollowing(followingList);

        if (!isOwnProfile && currentUserId !== user?.id) {
          const following = await ProfileService.isFollowing(currentUserId);
          setIsFollowing(following);
        }

      } catch (err: any) {
        console.error('Error loading profile:', err);
        // Only show error if no cached data
        if (!cachedProfile) {
          if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
            setError("User not found");
          }
        }
      } finally {
        setLoading(false);
        setContentLoading(false);
      }
    };

    fetchUserData();
    
    // Reset active tab if viewing another user's profile and currently on saved tab
    if (!isOwnProfile && activeTab === 'saved') {
      setActiveTab('posts');
    }
  }, [user, userIdentifier, isOwnProfile, cachedProfile]);

  /** Follow / Unfollow */
  const handleFollow = async () => {
    if (!user?.id || !targetUser?.id || isOwnProfile) return;
    try {
      if (isFollowing) {
        await ProfileService.unfollowUser(targetUser.id);
        setIsFollowing(false);
        setProfileUser(prev => prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev);
        toast({ title: "Unfollowed", description: `You unfollowed ${targetUser.name}` });
      } else {
        await ProfileService.followUser(targetUser.id);
        setIsFollowing(true);
        setProfileUser(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
        toast({ title: "Following", description: `You are now following ${targetUser.name}` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to update follow status", variant: "destructive" });
    }
  };

  /** Like / Save / Share helpers */
  const handleLikePost = async (postId: string) => {
    try { await dataService.likePost(postId); } catch { toast({ title: "Error", description: "Failed to like post", variant: "destructive" }); }
  };
  const handleSavePost = async (postId: string) => {
    try { await ProfileService.savePost(postId); toast({ title: "Saved", description: "Post saved" }); }
    catch { toast({ title: "Error", description: "Failed to save post", variant: "destructive" }); }
  };
  const handleSharePost = async (post: Post) => {
    try {
      if (navigator.share) await navigator.share({ title: post.content, url: window.location.href });
      else { navigator.clipboard.writeText(window.location.href); toast({ title: "Shared", description: "Link copied" }); }
    } catch { toast({ title: "Error", description: "Failed to share", variant: "destructive" }); }
  };
  
  // Download helper for saved media
  const getFilenameFromUrl = (url?: string) => {
    if (!url) return `media_${Date.now()}`;
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const last = parts[parts.length - 1];
      return last.split('?')[0] || `media_${Date.now()}`;
    } catch {
      return `media_${Date.now()}`;
    }
  };

  const downloadMedia = async (url?: string, fallbackName?: string) => {
    if (!url) {
      toast({ title: 'Error', description: 'No media URL found', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fallbackName || getFilenameFromUrl(url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast({ title: 'Downloaded', description: 'Media downloaded' });
    } catch (err) {
      console.error('Download error', err);
      toast({ title: 'Error', description: 'Failed to download media', variant: 'destructive' });
    } finally {
      setShowSavedOptions(false);
      setSelectedSaved(null);
    }
  };
  const handleUserClick = (userId: string) => navigate(`/profile/${userId}`);

  // Offline placeholder for content sections
  const OfflineContentPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-muted/30 backdrop-blur-xl flex items-center justify-center">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">
        Connect to the internet to view this content
      </p>
    </div>
  );

  if (!user) return null;
  
  // Show loading only when online with no cached data and no fallback
  if (loading && !cachedProfile && !isOffline && !profileUser) {
    return <Layout><div className="max-w-4xl mx-auto p-6 text-center"><LoadingDots /></div></Layout>;
  }
  
  if (error && error === "User not found") {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700">
            Go to Home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header - Always shows from cache */}
        <Card className="relative overflow-hidden backdrop-blur-md bg-white/10 border-white/20 shadow-xl">
          {targetUser?.coverImage && (
            <div className="h-48 md:h-64 relative">
              <img src={targetUser.coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-16 md:-mt-12">
              <div className="relative">
                <Avatar
                  className="w-32 h-32 border-4 border-white/20 backdrop-blur-sm bg-white/10 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => targetUser?.avatar && setShowImageModal(targetUser.avatar)}
                >
                  <AvatarImage src={targetUser?.avatar || targetUser?.photoURL} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                    {targetUser?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {targetUser?.is_verified && (
                  <div className="absolute bottom-2 right-2">
                    <VerificationBadge isVerified={true} size="md" />
                  </div>
                )}
                {targetUser?.isPrivate && <Badge className="absolute -bottom-2 -right-2 bg-orange-500">Private</Badge>}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-strong-contrast">{targetUser?.name}</h1>
                    {targetUser?.is_verified && (
                      <VerificationBadge isVerified={true} size="lg" showText />
                    )}
                  </div>
                  <p className="text-strong-contrast/80">@{targetUser?.username}</p>
                  {targetUser?.bio && <p className="text-strong-contrast/90 mt-2">{targetUser.bio}</p>}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-strong-contrast/80">
                  <div className="flex items-center space-x-1"><Calendar className="w-4 h-4" /><span>Joined {targetUser?.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(targetUser.createdAt) : 'Unknown'}</span></div>
                  {targetUser?.location && <div className="flex items-center space-x-1"><MapPin className="w-4 h-4" /><span>{targetUser.location}</span></div>}
                  {targetUser?.website && <div className="flex items-center space-x-1"><LinkIcon className="w-4 h-4" /><a href={targetUser.website} target="_blank" rel="noopener noreferrer">{targetUser.website}</a></div>}
                </div>

                <div className="flex space-x-6">
                  <div className="text-center"><p className="text-2xl font-bold">{userPosts.length}</p><p className="text-sm text-strong-contrast/80">Posts</p></div>
                  <div className="text-center"><p className="text-2xl font-bold">{userReels.length}</p><p className="text-sm text-strong-contrast/80">Reels</p></div>
                  <div className="text-center"><p className="text-2xl font-bold">{targetUser?.followerCount || 0}</p><p className="text-sm text-strong-contrast/80">Followers</p></div>
                  <div className="text-center"><p className="text-2xl font-bold">{targetUser?.followingCount || 0}</p><p className="text-sm text-strong-contrast/80">Following</p></div>
                </div>
              </div>

              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" className="backdrop-blur-sm bg-white/10 border-white/20" onClick={() => setShowEditDialog(true)}><Edit className="w-4 h-4 mr-2" />Edit Profile</Button>
                    <Button variant="outline" className="backdrop-blur-sm bg-green-600 text-white" onClick={() => setShowAvatarStudio(true)}><UserCircle className="w-4 h-4 mr-2" />Customize Avatar</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="backdrop-blur-sm bg-white/10 border-white/20" onClick={handleFollow}>
                      {isFollowing ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="backdrop-blur-sm bg-white/10 border-white/20"
                      onClick={async () => {
                        if (!targetUser?.id || !user?.id) return;
                        try {
                          const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
                            p_other_user_id: targetUser.id
                          });
                          
                          if (error) throw error;
                          
                          navigate('/chat');
                          
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('openChatWithUser', { 
                              detail: { userId: targetUser.id, chatId } 
                            }));
                          }, 300);
                        } catch (error) {
                          console.error('Error opening chat:', error);
                          toast({
                            title: "Error",
                            description: "Failed to open chat. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 gap-1">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="saved">Saved</TabsTrigger>}
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {contentLoading && userPosts.length === 0 ? (
              <div className="text-center py-8"><LoadingDots /></div>
            ) : isOffline && userPosts.length === 0 ? (
              <OfflineContentPlaceholder />
            ) : userPosts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {userPosts.map(post => (
                  <Card key={post.id} className="overflow-hidden cursor-pointer hover:ring-2 ring-primary">
                    <div className="aspect-square relative bg-muted">
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <p className="text-xs text-muted-foreground line-clamp-4">{post.content}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No posts yet</div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-6">
            {contentLoading && userReels.length === 0 ? (
              <div className="text-center py-8"><LoadingDots /></div>
            ) : isOffline && userReels.length === 0 ? (
              <OfflineContentPlaceholder />
            ) : userReels.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userReels.map(reel => (
                  <Card key={reel.id} className="overflow-hidden cursor-pointer hover:ring-2 ring-primary">
                    <div className="aspect-[9/16] relative bg-muted">
                      {reel.videoUrl ? (
                        <video
                          src={reel.videoUrl}
                          className="w-full h-full object-cover"
                          muted={isMuted}
                          preload="none"
                          poster={reel.imageUrl}
                        />
                      ) : reel.imageUrl ? (
                        <img src={reel.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted-foreground">No preview</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No reels yet</div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="saved" className="mt-6">
              {isOffline && savedPosts.length === 0 ? (
                <OfflineContentPlaceholder />
              ) : savedPosts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {savedPosts.map(saved => (
                    <Card 
                      key={saved.id} 
                      className="overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                      onClick={() => { setSelectedSaved(saved); setShowSavedOptions(true); }}
                    >
                      <div className="aspect-square relative bg-muted">
                        {saved.post?.imageUrl ? (
                          <img src={saved.post.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <p className="text-sm text-muted-foreground line-clamp-3">{saved.post?.content}</p>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2">
                          <Bookmark className="w-5 h-5 text-white drop-shadow-lg fill-current" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No saved posts</div>
              )}
            </TabsContent>
          )}

          <TabsContent value="groups" className="mt-6">
            {isOffline && userGroups.length === 0 ? (
              <OfflineContentPlaceholder />
            ) : userGroups.length > 0 ? (
              <div className="grid gap-4">
                {userGroups.map(group => (
                  <Card key={group.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">{group.member_count} members</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No groups yet</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <EditProfileDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={user}
      />

      <ImageModal 
        src={showImageModal || ''} 
        alt="Profile" 
        isOpen={!!showImageModal}
        onClose={() => setShowImageModal(null)} 
      />

      <AvatarStudio
        open={showAvatarStudio}
        onOpenChange={setShowAvatarStudio}
        onSave={(avatarUrl) => {
          console.log('Avatar saved:', avatarUrl);
          setShowAvatarStudio(false);
        }}
      />

      {/* Saved options dialog */}
      <Dialog open={showSavedOptions} onOpenChange={setShowSavedOptions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Saved Post Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => selectedSaved?.post?.imageUrl && downloadMedia(selectedSaved.post.imageUrl)}
            >
              Download Media
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive" 
              onClick={() => { setShowSavedOptions(false); setSelectedSaved(null); }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Profile;
