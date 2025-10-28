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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let currentUserId = user.id;
        if (userIdentifier) {
          const { data: profiles, error } = await supabase.from('profiles').select('*').or(`username.eq.${userIdentifier},id.eq.${userIdentifier}`).limit(1);
          if (error) throw error;
          if (!profiles?.length) { setError("User not found"); return; }
          const p = profiles[0];
          const foundUser = {
            id: p.id, name: p.name, username: p.username || `user_${p.id.slice(0,8)}`, email: p.email,
            avatar: p.avatar, photoURL: p.avatar, bio: p.bio, location: p.location, website: p.website,
            coverImage: p.cover_image, isPrivate: p.is_private, followerCount: p.follower_count||0,
            followingCount: p.following_count||0, createdAt: new Date(p.created_at)
          };
          setProfileUser(foundUser); currentUserId = foundUser.id;
        }
        const posts = await dataService.getPosts();
        const filteredPosts = posts.filter(p => p.userId === currentUserId);
        setUserPosts(filteredPosts.filter(p => !p.isReel));
        setUserReels(filteredPosts.filter(p => p.isReel));
      } catch (err) { console.error(err); setError("Failed to load profile data"); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [user, userIdentifier]);

  const handleFollow = async () => {
    if (!user?.id || !targetUser?.id || isOwnProfile) return;
    try { 
      setIsFollowing(prev => !prev); 
    } catch { toast({ title:"Error", description:"Failed to update follow status", variant:"destructive" }); }
  };

  if (!user) return null;
  if (loading) return <Layout><div className="max-w-4xl mx-auto p-6 text-center">Loading...</div></Layout>;
  if (error) return <Layout><div className="max-w-4xl mx-auto p-6 text-center text-red-500">{error}</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="relative overflow-hidden backdrop-blur-md bg-white/10 border-white/20 shadow-xl">
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-16 md:-mt-12">
              <Avatar className="w-32 h-32 border-4 border-white/20 backdrop-blur-sm bg-white/10 cursor-pointer hover:scale-105 transition-transform" onClick={() => targetUser?.avatar && setShowImageModal(targetUser.avatar)}>
                <AvatarImage src={targetUser?.avatar || targetUser?.photoURL}/>
                <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">{targetUser?.name?.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <h1 className="text-3xl font-bold text-strong-contrast">{targetUser?.name}</h1>
                <p className="text-strong-contrast/80">@{targetUser?.username}</p>
              </div>

              <div className="flex space-x-2">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" onClick={() => setShowEditDialog(true)}><Edit className="w-4 h-4 mr-2"/>Edit Profile</Button>
                    <Button variant="outline" onClick={() => setShowAvatarStudio(true)}><UserCircle className="w-4 h-4 mr-2"/>Customize Avatar</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleFollow}>{isFollowing ? "Unfollow" : "Follow"}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <EditProfileDialog open={showEditDialog} onOpenChange={setShowEditDialog} user={user} />
        {showImageModal && <ImageModal src={showImageModal} alt="Profile Picture" isOpen={!!showImageModal} onClose={() => setShowImageModal(null)} />}
        <AvatarStudio open={showAvatarStudio} onOpenChange={setShowAvatarStudio} initialAvatar={{ skin:"#f5cba7", hair:"#2c1a0e", outfit:"#4ade80" }} onSave={data => console.log("Avatar saved", data)} />
      </div>
    </Layout>
  );
};

export default Profile;
