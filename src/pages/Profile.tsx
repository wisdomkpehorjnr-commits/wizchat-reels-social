
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
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, Settings } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userIdentifier } = useParams();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [profileUser, setProfileUser] = useState(null);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if this is the current user's profile or someone else's
  const isOwnProfile = !userIdentifier;
  const targetUser = profileUser || user;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        let currentUserId = user.id;
        let currentUser = user;
        
        // If viewing someone else's profile, fetch their data first
        if (userIdentifier) {
          try {
            // Use supabase directly for more accurate search
            const { data: profiles, error } = await supabase
              .from('profiles')
              .select('*')
              .or(`username.eq.${userIdentifier},id.eq.${userIdentifier}`)
              .limit(1);

            if (error) throw error;

            if (profiles && profiles.length > 0) {
              const foundProfile = profiles[0];
              const foundUser = {
                id: foundProfile.id,
                name: foundProfile.name,
                username: foundProfile.username,
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
                followerCount: foundProfile.follower_count,
                followingCount: foundProfile.following_count,
                profileViews: foundProfile.profile_views,
                createdAt: new Date(foundProfile.created_at)
              };
              
              setProfileUser(foundUser);
              currentUserId = foundUser.id;
              currentUser = foundUser;
            } else {
              setError("User not found");
              return;
            }
          } catch (error) {
            console.error('Error fetching user:', error);
            setError("Failed to load user profile");
            return;
          }
        }
        
        // Fetch posts
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(post => post.userId === currentUserId);
        setUserPosts(filteredPosts.filter(post => !post.isReel));
        setUserReels(filteredPosts.filter(post => post.isReel));

        // Only fetch saved posts for own profile
        if (isOwnProfile) {
          try {
            const saved = await ProfileService.getSavedPosts();
            setSavedPosts(saved);
          } catch (error) {
            console.log('Error fetching saved posts:', error);
            setSavedPosts([]);
          }
        }

        // Fetch followers and following
        if (currentUserId) {
          try {
            const [followersList, followingList] = await Promise.all([
              ProfileService.getFollowers(currentUserId).catch(() => []),
              ProfileService.getFollowing(currentUserId).catch(() => [])
            ]);
            setFollowers(followersList);
            setFollowing(followingList);
          } catch (error) {
            console.log('Error fetching social data:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, userIdentifier, isOwnProfile]);

  const handleFollow = async () => {
    if (!user?.id) return;
    
    try {
      if (isFollowing) {
        await ProfileService.unfollowUser(user.id);
        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You unfollowed ${user.name}`,
        });
      } else {
        await ProfileService.followUser(user.id);
        setIsFollowing(true);
        toast({
          title: "Following",
          description: `You are now following ${user.name}`,
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const handleSavePost = async (postId: string) => {
    try {
      await ProfileService.savePost(postId);
      toast({
        title: "Saved",
        description: "Post saved to your collection",
      });
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive",
      });
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await dataService.likePost(postId);
      toast({
        title: "Liked",
        description: "Post liked",
      });
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleSharePost = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.content,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Shared",
          description: "Link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header with Glassmorphism */}
        <Card className="relative overflow-hidden backdrop-blur-md bg-white/10 border-white/20 shadow-xl">
          {/* Cover Image */}
          {targetUser?.coverImage && (
            <div className="h-48 md:h-64 relative">
              <img
                src={targetUser.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
          
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-16 md:-mt-12">
              {/* Profile Picture */}
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white/20 backdrop-blur-sm bg-white/10">
                  <AvatarImage src={targetUser?.avatar || targetUser?.photoURL} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                    {targetUser?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {targetUser?.isPrivate && (
                  <Badge className="absolute -bottom-2 -right-2 bg-orange-500">
                    Private
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-white">{targetUser?.name}</h1>
                  <p className="text-white/80">@{targetUser?.username}</p>
                  {targetUser?.bio && (
                    <p className="text-white/90 mt-2">{targetUser.bio}</p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(targetUser?.createdAt || new Date())}</span>
                  </div>
                  {targetUser?.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{targetUser.location}</span>
                    </div>
                  )}
                  {targetUser?.website && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="w-4 h-4" />
                      <a href={targetUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        {targetUser.website}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex space-x-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{userPosts.length}</p>
                    <p className="text-sm text-white/80">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{userReels.length}</p>
                    <p className="text-sm text-white/80">Reels</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{targetUser?.followerCount || 0}</p>
                    <p className="text-sm text-white/80">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{targetUser?.followingCount || 0}</p>
                    <p className="text-sm text-white/80">Following</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline"
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={handleFollow}
                    >
                      {isFollowing ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
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
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white/5 backdrop-blur-sm">
              <TabsTrigger value="posts" className="data-[state=active]:bg-white/20">Posts</TabsTrigger>
              <TabsTrigger value="reels" className="data-[state=active]:bg-white/20">Reels</TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-white/20">Media</TabsTrigger>
              <TabsTrigger value="saved" className="data-[state=active]:bg-white/20">
                <Bookmark className="w-4 h-4 mr-1" />
                Saved
              </TabsTrigger>
              <TabsTrigger value="groups" className="data-[state=active]:bg-white/20">
                <Users className="w-4 h-4 mr-1" />
                Groups
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4">
                {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostUpdate={() => {}}
                />
                ))}
              </div>
              
              {userPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/60">No posts yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="reels" className="space-y-4 p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userReels.map((reel) => (
                  <ReelCard 
                    key={reel.id} 
                    post={reel} 
                    onLike={handleLikePost}
                    onUserClick={handleUserClick}
                    onShare={handleSharePost}
                    isMuted={isMuted}
                    onMuteToggle={() => setIsMuted(!isMuted)}
                  />
                ))}
              </div>
              
              {userReels.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/60">No reels yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="media" className="space-y-4 p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {[...userPosts, ...userReels]
                  .filter(post => post.imageUrl || post.videoUrl)
                  .map((post) => (
                    <div key={post.id} className="aspect-square rounded-lg overflow-hidden">
                      {post.videoUrl ? (
                        <video
                          src={post.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={post.imageUrl}
                          alt="Media"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="saved" className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4">
                {savedPosts.map((savedPost) => (
                   <PostCard 
                     key={savedPost.id} 
                     post={savedPost.post}
                     onPostUpdate={() => {}}
                   />
                ))}
              </div>
              
              {savedPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/60">No saved posts yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-4 p-4">
              <div className="text-center py-12">
                <p className="text-white/60">Groups feature coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Edit Profile Dialog */}
        <EditProfileDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog}
          user={user}
        />
      </div>
    </Layout>
  );
};

export default Profile;
