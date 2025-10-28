import { useState, useEffect } from 'react';
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
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, UserCircle } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import ImageModal from '@/components/ImageModal';
import AvatarStudio from '@/components/AvatarStudio';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';

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

        // If viewing another profile, fetch it
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
            createdAt: new Date(foundProfile.created_at)
          };
          setProfileUser(foundUser);
          currentUserId = foundUser.id;
          currentUser = foundUser;
        }

        // Fetch posts & reels
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(p => p.userId === currentUserId);
        setUserPosts(filteredPosts.filter(p => !p.isReel));
        setUserReels(filteredPosts.filter(p => p.isReel));

        // Saved posts for own profile
        if (isOwnProfile) {
          const saved = await ProfileService.getSavedPosts().catch(() => []);
          setSavedPosts(saved);
        }

        // Followers & following
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
                {targetUser?.isPrivate && <Badge className="absolute -bottom-2 -right-2 bg-orange-500">Private</Badge>}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-strong-contrast">{targetUser?.name}</h1>
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
                    <Button variant="outline" className="backdrop-blur-sm bg-green-600 text-white" onClick={() => navigate("/avatar")}><UserCircle className="w-4 h-4 mr-2" />Customize Avatar</Button>
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
            <TabsList className="grid grid-cols-5 bg-white/5 backdrop-blur-sm">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="saved"><Bookmark className="w-4 h-4 mr-1" />Saved</TabsTrigger>
              <TabsTrigger value="groups"><Users className="w-4 h-4 mr-1" />Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="p-4 space-y-4">
              {userPosts.length > 0 ? userPosts.map(p => <PostCard key={p.id} post={p} onPostUpdate={() => {}} />) :
                <div className="text-center py-12 text-strong-contrast/60">No posts yet</div>}
            </TabsContent>

            <TabsContent value="reels" className="p-4 space-y-4">
              {userReels.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userReels.map(r => <ReelCard key={r.id} post={r} onLike={handleLikePost} onUserClick={handleUserClick} onShare={handleSharePost} isMuted={isMuted} onMuteToggle={() => setIsMuted(!isMuted)} />)}
                </div>
              ) : <div className="text-center py-12 text-strong-contrast/60">No reels yet</div>}
            </TabsContent>

            <TabsContent value="media" className="p-4 space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {[...userPosts, ...userReels].filter(p => p.imageUrl || p.videoUrl).map(p => (
                  <div key={p.id} className="aspect-square rounded-lg overflow-hidden">
                    {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-cover" muted /> : <img src={p.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
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

        <EditProfileDialog open={showEditDialog} onOpenChange={setShowEditDialog} user={user} />
        {showImageModal && <ImageModal src={showImageModal} alt="Profile Picture" isOpen={!!showImageModal} onClose={() => setShowImageModal(null)} />}
        <AvatarStudio open={showAvatarStudio} onOpenChange={setShowAvatarStudio} onSave={data => console.log("Avatar saved", data)} />
      </div>
    </Layout>
  );
};

export default Profile;
