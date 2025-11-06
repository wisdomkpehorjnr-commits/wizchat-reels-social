import { useState, useEffect } from 'react';
import ThemeAwareDialog from '@/components/ThemeAwareDialog';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { Post, SavedPost, Follow } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, UserCircle, Trash2 } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import ImageModal from '@/components/ImageModal';
import AvatarStudio from '@/components/AvatarStudio';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import VerificationBadge from '@/components/VerificationBadge';

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

  const isOwnProfile = !userIdentifier;
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

      } catch (err) {
        console.error(err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
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
  const handleUserClick = (userId: string) => navigate(`/profile/${userId}`);

  if (!user) return null;
  if (loading) return <Layout><div className="max-w-4xl mx-auto p-6 text-center">Loading...</div></Layout>;
  if (error) return <Layout><div className="max-w-4xl mx-auto p-6 text-center text-red-500">{error}</div></Layout>;

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
                    <Button variant="outline" className="backdrop-blur-sm bg-white/10 border-white/20"><MessageCircle className="w-4 h-4 mr-2" />Message</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 bg-white/5 backdrop-blur-sm">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="saved"><Bookmark className="w-4 h-4 mr-1" />Saved</TabsTrigger>
              <TabsTrigger value="groups"><Users className="w-4 h-4 mr-1" />Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="p-4">
              {userPosts.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {userPosts.map(p => (
                    <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate(`/post/${p.id}`)}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} className="w-full h-full object-cover" alt="Post" />
                      ) : p.videoUrl ? (
                        <video src={p.videoUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center p-2">
                          <p className="text-xs text-center line-clamp-3">{p.content}</p>
                        </div>
                      )}
                      {isOwnProfile && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePostId(p.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-12 text-strong-contrast/60">No posts yet</div>}
            </TabsContent>

            <TabsContent value="reels" className="p-4">
              {userReels.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {userReels.map(r => (
                    <div key={r.id} className="relative group aspect-[9/16] rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate(`/reels`)}>
                      {r.videoUrl && <video src={r.videoUrl} className="w-full h-full object-cover" muted />}
                      {isOwnProfile && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePostId(r.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-12 text-strong-contrast/60">No reels yet</div>}
            </TabsContent>

            <TabsContent value="saved" className="p-4 space-y-4">
              {savedPosts.length > 0 ? savedPosts.map(s => <PostCard key={s.id} post={s.post} onPostUpdate={() => {}} />) :
                <div className="text-center py-12 text-white/60">No saved posts yet</div>}
            </TabsContent>

            <TabsContent value="groups" className="p-4 space-y-4">
              <div className="text-center py-12 text-white/60">Groups feature coming soon</div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Modals & Dialogs */}
        <EditProfileDialog open={showEditDialog} onOpenChange={setShowEditDialog} user={user} />
        {showImageModal && <ImageModal src={showImageModal} alt="Profile Picture" isOpen={!!showImageModal} onClose={() => setShowImageModal(null)} />}
        <AvatarStudio open={showAvatarStudio} onOpenChange={setShowAvatarStudio} onSave={data => console.log("Avatar saved", data)} />
        
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
      </div>
    </Layout>
  );
};

export default Profile;
