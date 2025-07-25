
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
import { Calendar, MapPin, Link as LinkIcon, Edit, MessageCircle, UserPlus, UserMinus, Bookmark, Users, Settings } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostCard from '@/components/PostCard';
import ReelCard from '@/components/ReelCard';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch posts
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(post => post.userId === user?.id);
        setUserPosts(filteredPosts.filter(post => !post.isReel));
        setUserReels(filteredPosts.filter(post => post.isReel));

        // Fetch saved posts
        const saved = await ProfileService.getSavedPosts();
        setSavedPosts(saved);

        // Fetch followers and following
        if (user?.id) {
          const [followersList, followingList] = await Promise.all([
            ProfileService.getFollowers(user.id),
            ProfileService.getFollowing(user.id)
          ]);
          setFollowers(followersList);
          setFollowing(followingList);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user, toast]);

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header with Glassmorphism */}
        <Card className="relative overflow-hidden backdrop-blur-md bg-white/10 border-white/20 shadow-xl">
          {/* Cover Image */}
          {user.coverImage && (
            <div className="h-48 md:h-64 relative">
              <img
                src={user.coverImage}
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
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.isPrivate && (
                  <Badge className="absolute -bottom-2 -right-2 bg-orange-500">
                    Private
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                  <p className="text-white/80">@{user.username}</p>
                  {user.bio && (
                    <p className="text-white/90 mt-2">{user.bio}</p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt)}</span>
                  </div>
                  {user.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="w-4 h-4" />
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        {user.website}
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
                    <p className="text-2xl font-bold text-white">{user.followerCount}</p>
                    <p className="text-sm text-white/80">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{user.followingCount}</p>
                    <p className="text-sm text-white/80">Following</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
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
                    onSave={() => handleSavePost(post.id)}
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
                    onSave={() => handleSavePost(savedPost.post.id)}
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
