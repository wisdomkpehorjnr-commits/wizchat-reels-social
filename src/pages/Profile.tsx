import { useState, useEffect, useRef } from 'react';
import ThemeAwareDialog from '@/components/ThemeAwareDialog';
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
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, UserCircle, Trash2, Heart, ThumbsUp, X } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ImageModal from '@/components/ImageModal';
import AvatarStudio, { EnhancedAvatarData } from '@/components/AvatarStudio';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import VerificationBadge from '@/components/VerificationBadge';
import LoadingDots from '@/components/LoadingDots';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userIdentifier } = useParams();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
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

  // Saved item long-press / download
  const [selectedSaved, setSelectedSaved] = useState<SavedPost | null>(null);
  const [showSavedOptions, setShowSavedOptions] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  // Determine if this is the current user's profile
  // Check both if there's no userIdentifier (own profile route) or if the profileUser matches current user
  const isOwnProfile = !userIdentifier || (profileUser && user && profileUser.id === user.id);
  const targetUser = profileUser || user;

  /** Fetch profile data */
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

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
        }

        // Posts & reels
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(p => p.userId === currentUserId);
        setUserPosts(filteredPosts.filter(p => !p.isReel));
        setUserReels(filteredPosts.filter(p => p.isReel));

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
        // Only show error if it's a critical error, not just missing data
        if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
          setError("User not found");
        } else {
          // For other errors, try to still show what we can
          setError(null);
          // If we have userIdentifier, try to load basic profile info
          if (userIdentifier && !profileUser) {
            try {
              const { data: basicProfile } = await supabase
                .from('profiles')
                .select('id, name, username, email, avatar')
                .or(`username.eq.${userIdentifier},id.eq.${userIdentifier}`)
                .limit(1)
                .single();
              
              if (basicProfile) {
                setProfileUser({
                  id: basicProfile.id,
                  name: basicProfile.name,
                  username: basicProfile.username || `user_${basicProfile.id.slice(0, 8)}`,
                  email: basicProfile.email,
                  avatar: basicProfile.avatar || '',
                  photoURL: basicProfile.avatar || '',
                  followerCount: 0,
                  followingCount: 0,
                  profileViews: 0,
                  createdAt: new Date()
                });
              }
            } catch (fallbackErr) {
              setError("User not found");
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    
    // Reset active tab if viewing another user's profile and currently on saved tab
    if (!isOwnProfile && activeTab === 'saved') {
      setActiveTab('posts');
    }
  }, [user, userIdentifier, isOwnProfile]);

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

  if (!user) return null;
  if (loading) return <Layout><div className="max-w-4xl mx-auto p-6 text-center"><LoadingDots /></div></Layout>;
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
        {/* Profile Header */}
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
                  <div className="flex items-center space-x-1"><Calendar className="w-4 h-4" /><span>Joined {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(targetUser?.createdAt)}</span></div>
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
                          // Get or create chat with the user
                          const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
                            p_other_user_id: targetUser.id
                          });
                          
                          if (error) throw error;
                          
                          // Navigate to chat page
                          navigate('/chat');
                          
                          // After navigation, trigger opening the chat with this user
                          // We'll use a custom event or URL parameter
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
                      <MessageCircle className="w-4 h-4 mr-2" />Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts and Reels Section */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-2'} bg-white/5 backdrop-blur-sm`}>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="saved"><Bookmark className="w-4 h-4 mr-1" />Saved</TabsTrigger>}
              {isOwnProfile && <TabsTrigger value="groups"><Users className="w-4 h-4 mr-1" />Groups</TabsTrigger>}
            </TabsList>

            <TabsContent value="posts" className="p-2">
              {userPosts.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {userPosts.map(post => (
                    <div
                      key={post.id}
                      className="aspect-square relative rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                      onClick={() => {
                        // Navigate to post or show full view
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt={post.content || 'Post'}
                          className="w-full h-full object-cover"
                        />
                      ) : post.videoUrl ? (
                        <video
                          src={post.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center p-1">
                          <p className="text-white text-[10px] text-center line-clamp-2">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 text-white">
                          <Heart className="w-3 h-3 fill-white" />
                          <span className="text-[10px]">{post.likes?.length || 0}</span>
                        </div>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostToDelete(post.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600/80 backdrop-blur-sm rounded-full p-1.5 z-10"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-strong-contrast/60">No posts yet</div>
              )}
            </TabsContent>

            <TabsContent value="reels" className="p-2">
              {userReels.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {userReels.map(reel => (
                    <div
                      key={reel.id}
                      className="aspect-[9/16] relative rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                      onClick={() => {
                        navigate('/reels');
                      }}
                    >
                      {reel.videoUrl ? (
                        <video
                          src={reel.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : reel.imageUrl ? (
                        <img
                          src={reel.imageUrl}
                          alt={reel.content || 'Reel'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center p-1">
                          <p className="text-white text-[10px] text-center line-clamp-2">{reel.content}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 text-white">
                          <ThumbsUp className="w-3 h-3 fill-white" />
                          <span className="text-[10px]">{reel.likes?.length || 0}</span>
                        </div>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setPostToDelete(reel.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600/80 backdrop-blur-sm rounded-full p-1.5 z-10"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-strong-contrast/60">No reels yet</div>
              )}
            </TabsContent>

            {isOwnProfile && (
              <>
                <TabsContent value="saved" className="p-2">
                  {savedPosts.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                      {savedPosts.map(s => {
                        const isReel = s.post.videoUrl || s.post.isReel || s.post.mediaType === 'video';
                        const mediaUrl = s.post.videoUrl || s.post.imageUrl;
                        return (
                          <div
                            key={s.id}
                            className={`relative rounded overflow-hidden cursor-pointer group ${isReel ? 'aspect-[9/16]' : 'aspect-square'}`}
                            onClick={() => { if (isReel) navigate('/reels'); else { /* could open post */ } }}
                            onPointerDown={() => { longPressTimer.current = window.setTimeout(() => { setSelectedSaved(s); setShowSavedOptions(true); }, 600); }}
                            onPointerUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                            onPointerLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                          >
                            {s.post.videoUrl ? (
                              <video src={s.post.videoUrl} className="w-full h-full object-cover" muted />
                            ) : s.post.imageUrl ? (
                              <img src={s.post.imageUrl} alt={s.post.content || 'Saved'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center p-1">
                                <p className="text-white text-[10px] text-center line-clamp-2">{s.post.content}</p>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 text-white">
                                <Heart className="w-3 h-3 fill-white" />
                                <span className="text-[10px]">{s.post.likes?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-strong-contrast/60">No saved posts yet</div>
                  )}
                </TabsContent>
                
                <TabsContent value="groups" className="p-4">
                  {userGroups.length > 0 ? (
                    <div className="space-y-3">
                      {userGroups.map((group) => (
                        <Card key={group.id} className="backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-strong-contrast flex items-center gap-2">
                                  <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  {group.name}
                                </h3>
                                {group.description && (
                                  <p className="text-sm text-strong-contrast/70 mt-1">{group.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-strong-contrast/60">
                                  <span>{group.memberCount || 0} members</span>
                                  {group.isPrivate && <span className="text-orange-500">Private</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-strong-contrast/60">No groups yet. Join or create a group to get started!</div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>

        {/* Modals & Dialogs */}
        <EditProfileDialog open={showEditDialog} onOpenChange={setShowEditDialog} user={user} />
        {showImageModal && <ImageModal src={showImageModal} alt="Profile Picture" isOpen={!!showImageModal} onClose={() => setShowImageModal(null)} />}
        <AvatarStudio 
          open={showAvatarStudio} 
          onOpenChange={setShowAvatarStudio}
          initialAvatar={(() => {
            // Try to parse saved avatar data from user's avatar field
            if (user?.avatar) {
              try {
                const parsed = JSON.parse(user.avatar);
                // Check if it's valid EnhancedAvatarData (has required fields)
                if (parsed && typeof parsed === 'object' && ('skinColor' in parsed || 'headColor' in parsed || 'gender' in parsed)) {
                  return parsed as Partial<EnhancedAvatarData>;
                }
              } catch {
                // If parsing fails, it's probably a URL, return undefined
              }
            }
            return undefined;
          })()}
          onSave={async (data) => {
            try {
              // Save avatar data as JSON string
              const avatarDataJson = JSON.stringify(data);
              await ProfileService.updateProfile({ avatar: avatarDataJson });
              toast({ 
                title: "Success", 
                description: "Avatar saved successfully!" 
              });
              // Reload to show updated avatar
              window.location.reload();
            } catch (error) {
              toast({ 
                title: "Error", 
                description: "Failed to save avatar", 
                variant: "destructive" 
              });
            }
          }} 
        />
        
        <Dialog open={showSavedOptions} onOpenChange={(open) => { if (!open) { setShowSavedOptions(false); setSelectedSaved(null); } }}>
          <DialogContent className="bg-white dark:bg-gray-900 border border-green-500 rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-green-700">Saved Item</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex flex-col gap-3">
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                if (selectedSaved) {
                  const media = selectedSaved.post.videoUrl || selectedSaved.post.imageUrl;
                  await downloadMedia(media, selectedSaved.post.id || undefined);
                }
              }}>
                Download
              </Button>
              <Button variant="outline" onClick={() => { setShowSavedOptions(false); setSelectedSaved(null); }}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ThemeAwareDialog
          open={!!deletePostId}
          onOpenChange={(open) => !open && setDeletePostId(null)}
          title="Delete Post"
          description="Are you sure you want to delete this post? This action cannot be undone."
          onConfirm={() => {
            if (deletePostId) {
              dataService.deletePost(deletePostId).then(() => {
                toast({ title: "Success", description: "Post deleted successfully" });
                window.location.reload();
              }).catch(() => {
                toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
              });
              setDeletePostId(null);
            }
          }}
        />
        
        {/* Delete Post Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-white dark:bg-gray-900 border border-green-500 rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center justify-between">
                <span>Delete Post</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPostToDelete(null);
                  }}
                  className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPostToDelete(null);
                }}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (postToDelete) {
                    try {
                      await dataService.deletePost(postToDelete);
                      toast({ title: "Success", description: "Post deleted successfully" });
                      setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
                      setShowDeleteConfirm(false);
                      setPostToDelete(null);
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Profile;
