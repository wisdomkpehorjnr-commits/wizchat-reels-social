
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Post, TopicRoom as TopicRoomType } from '@/types';

const TopicRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<TopicRoomType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadRoomData();
      subscribeToUpdates();
    }
  }, [roomId]);

  const loadRoomData = async () => {
    if (!roomId || !user) return;
    
    try {
      setLoading(true);
      console.log('Loading room data for:', roomId);
      
      // Load room details
      const { data: roomData, error: roomError } = await supabase
        .from('topic_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      setRoom({
        id: roomData.id,
        name: roomData.name,
        description: roomData.description,
        isActive: roomData.is_active,
        participantCount: roomData.participant_count,
        createdAt: new Date(roomData.created_at),
        updatedAt: new Date(roomData.updated_at)
      });

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles (
            id,
            name,
            username,
            avatar
          )
        `)
        .eq('room_id', roomId);

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);
      setIsParticipant(participantsData?.some(p => p.user_id === user.id) || false);

      // Load room posts with proper join
      const { data: postsData, error: postsError } = await supabase
        .from('room_posts')
        .select(`
          id,
          user_id,
          content,
          image_url,
          video_url,
          media_type,
          created_at,
          profiles!room_posts_user_id_fkey (
            id,
            name,
            username,
            avatar
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading room posts:', postsError);
        setPosts([]);
      } else {
        const formattedPosts = postsData?.map(post => ({
          id: post.id,
          userId: post.user_id,
          user: {
            id: post.profiles?.id || post.user_id,
            name: post.profiles?.name || 'Unknown User',
            username: post.profiles?.username || 'unknown',
            email: '',
            photoURL: post.profiles?.avatar || '',
            avatar: post.profiles?.avatar || '',
            bio: '',
            followerCount: 0,
            followingCount: 0,
            profileViews: 0,
            createdAt: new Date()
          },
          content: post.content,
          imageUrl: post.image_url,
          videoUrl: post.video_url,
          mediaType: post.media_type as 'text' | 'image' | 'video',
          likes: [],
          comments: [],
          reactions: [],
          hashtags: [],
          createdAt: new Date(post.created_at)
        })) || [];
        
        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error loading room data:', error);
      toast({
        title: "Error",
        description: "Failed to load room data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_posts',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadRoomData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const joinRoom = async () => {
    if (!user || !roomId) return;
    
    try {
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id
        });

      if (error) throw error;

      // Update participant count
      await supabase
        .from('topic_rooms')
        .update({ participant_count: participants.length + 1 })
        .eq('id', roomId);

      setIsParticipant(true);
      loadRoomData();
      
      toast({
        title: "Success",
        description: "You've joined the room!",
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
    }
  };

  const handlePostCreated = async (postData: any) => {
    if (!user || !roomId) return;
    
    try {
      // Create post in room_posts table
      const { error } = await supabase
        .from('room_posts')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: postData.content,
          image_url: postData.imageUrl,
          video_url: postData.videoUrl,
          media_type: postData.mediaType
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post shared in room!",
      });
      
      loadRoomData();
    } catch (error) {
      console.error('Error creating room post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-20 bg-muted rounded mb-6" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Room not found</h2>
            <Button onClick={() => navigate('/topics')}>
              Back to Topics
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/topics')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Topics
            </Button>
          </div>

          {/* Room Info */}
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    {room.name}
                  </CardTitle>
                  {room.description && (
                    <p className="text-muted-foreground mt-2">{room.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-foreground">
                    <Users className="w-3 h-3 mr-1" />
                    {room.participantCount} participants
                  </Badge>
                  {!isParticipant && (
                    <Button onClick={joinRoom} className="text-foreground">
                      Join Room
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Post Creation */}
          {isParticipant && (
            <Card className="border-2 green-border mb-6">
              <CardContent className="p-6">
                <CreatePost 
                  onPostCreated={handlePostCreated}
                  placeholder="Share something with the room..."
                />
              </CardContent>
            </Card>
          )}

          {!isParticipant && (
            <Card className="border-2 green-border mb-6">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Join the conversation</h3>
                <p className="text-muted-foreground mb-4">
                  Join this room to start posting and interacting with other members.
                </p>
                <Button onClick={joinRoom} className="text-foreground">
                  Join Room
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Posts */}
          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onPostUpdate={loadRoomData}
                />
              ))
            ) : (
              <Card className="border-2 green-border">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No posts yet. Be the first to share something!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TopicRoom;
