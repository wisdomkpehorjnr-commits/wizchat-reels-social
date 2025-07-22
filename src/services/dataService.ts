import { supabase } from '@/integrations/supabase/client';
import { 
  Post, 
  User, 
  Comment, 
  Friend, 
  Chat, 
  Message, 
  CreatePostData, 
  CreateChatData,
  Hashtag,
  MusicTrack,
  Story,
  Notification
} from '@/types';

class DataService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        photoURL: profile.avatar || '',
        avatar: profile.avatar || '',
        createdAt: new Date(profile.created_at)
      };
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        photoURL: profile.avatar || '',
        avatar: profile.avatar || '',
        createdAt: new Date(profile.created_at)
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // After successful signup, create a user profile
      const newUser: Partial<User> = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.email.split('@')[0], // Default username
        name: data.user.email.split('@')[0],     // Default name
        avatar: '',                               // Default avatar
      };

      return this.createUser(newUser);
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) throw error;

      // The user will be redirected to Google for authentication.
      // After successful authentication, they will be redirected back to your app.
      // You can then retrieve the user's information using getCurrentUser().

      return this.getCurrentUser();
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username: userData.username,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        photoURL: data.avatar || '',
        avatar: data.avatar || '',
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        photoURL: user.avatar || '',
        avatar: user.avatar || '',
        createdAt: new Date(user.created_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm
      });

      if (error) throw error;

      return data?.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        photoURL: user.avatar || '',
        avatar: user.avatar || '',
        createdAt: new Date(user.created_at)
      })) || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getFriends(): Promise<Friend[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('friends')
        .select(`
          *,
          requester:profiles!friends_requester_id_fkey(*),
          addressee:profiles!friends_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(friend => ({
        id: friend.id,
        requesterId: friend.requester_id,
        addresseeId: friend.addressee_id,
        requester: {
          id: friend.requester.id,
          name: friend.requester.name,
          username: friend.requester.username,
          email: friend.requester.email,
          photoURL: friend.requester.avatar || '',
          avatar: friend.requester.avatar || '',
          createdAt: new Date(friend.requester.created_at)
        },
        addressee: {
          id: friend.addressee.id,
          name: friend.addressee.name,
          username: friend.addressee.username,
          email: friend.addressee.email,
          photoURL: friend.addressee.avatar || '',
          avatar: friend.addressee.avatar || '',
          createdAt: new Date(friend.addressee.created_at)
        },
        status: friend.status as 'pending' | 'accepted' | 'declined' | 'blocked',
        createdAt: new Date(friend.created_at),
        updatedAt: new Date(friend.updated_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  async getPosts(): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles(*),
          likes:likes(*),
          comments:comments(*),
          reactions:reactions(*),
          music:music_library(*),
          post_hashtags(
            hashtag:hashtags(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data?.map(post => ({
        id: post.id,
        userId: post.user_id,
        user: {
          id: post.user.id,
          name: post.user.name,
          username: post.user.username,
          email: post.user.email,
          photoURL: post.user.avatar || '',
          avatar: post.user.avatar || '',
          createdAt: new Date(post.user.created_at)
        },
        content: post.content,
        imageUrl: post.image_url,
        videoUrl: post.video_url,
        mediaType: (post.media_type || 'text') as 'text' | 'image' | 'video',
        isReel: post.is_reel || false,
        musicId: post.music_id,
        music: post.music ? {
          id: post.music.id,
          title: post.music.title,
          artist: post.music.artist,
          duration: post.music.duration,
          fileUrl: post.music.file_url,
          isRoyaltyFree: post.music.is_royalty_free,
          createdAt: new Date(post.music.created_at)
        } : undefined,
        likes: post.likes?.map((like: any) => like.user_id) || [],
        reactions: post.reactions?.map((reaction: any) => ({
          id: reaction.id,
          userId: reaction.user_id,
          user: reaction.user,
          postId: reaction.post_id,
          emoji: reaction.emoji,
          createdAt: new Date(reaction.created_at)
        })) || [],
        comments: post.comments || [],
        hashtags: post.post_hashtags?.map((ph: any) => ph.hashtag) || [],
        createdAt: new Date(post.created_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async createPost(postData: CreatePostData): Promise<Post> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postData.content,
          media_type: postData.mediaType || 'text',
          is_reel: postData.isReel || false,
          music_id: postData.musicId
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        user: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          photoURL: profile.avatar || '',
          avatar: profile.avatar || '',
          createdAt: new Date(profile.created_at)
        },
        content: post.content,
        imageUrl: post.image_url,
        videoUrl: post.video_url,
        mediaType: (post.media_type || 'text') as 'text' | 'image' | 'video',
        isReel: post.is_reel || false,
        musicId: post.music_id,
        likes: [],
        reactions: [],
        comments: [],
        hashtags: [],
        createdAt: new Date(post.created_at)
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async likePost(postId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user already liked the post
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike the post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
      } else {
        // Like the post
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            post_id: postId
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async addReaction(postId: string, emoji: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('reactions')
        .insert({
          user_id: user.id,
          post_id: postId,
          emoji: emoji
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(postId: string, emoji: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .eq('emoji', emoji);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Music library methods
  async getMusicLibrary(): Promise<MusicTrack[]> {
    try {
      const { data, error } = await supabase
        .from('music_library')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;

      return data?.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        fileUrl: track.file_url,
        isRoyaltyFree: track.is_royalty_free,
        createdAt: new Date(track.created_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching music library:', error);
      throw error;
    }
  }

  // Stories methods
  async createStory(content: string, mediaUrl?: string, mediaType: 'image' | 'video' = 'image'): Promise<Story> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content,
          media_url: mediaUrl,
          media_type: mediaType
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        id: data.id,
        userId: data.user_id,
        user: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          photoURL: profile.avatar || '',
          avatar: profile.avatar || '',
          createdAt: new Date(profile.created_at)
        },
        content: data.content,
        mediaUrl: data.media_url,
        mediaType: data.media_type as 'image' | 'video',
        viewerCount: data.viewer_count,
        expiresAt: new Date(data.expires_at),
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  // Notifications methods
  async createNotification(userId: string, type: string, title: string, message: string, data?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();
