
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
  Notification,
  CustomEmoji
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
        id: data.user?.id,
        email: data.user?.email || email,
        username: email.split('@')[0], // Default username
        name: email.split('@')[0],     // Default name
        avatar: '',                    // Default avatar
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
          id: userData.id,
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
          comments:comments(
            *,
            user:profiles(*)
          ),
          reactions:reactions(
            *,
            user:profiles(*)
          ),
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
          user: {
            id: reaction.user.id,
            name: reaction.user.name,
            username: reaction.user.username,
            email: reaction.user.email,
            photoURL: reaction.user.avatar || '',
            avatar: reaction.user.avatar || '',
            createdAt: new Date(reaction.user.created_at)
          },
          postId: reaction.post_id,
          emoji: reaction.emoji,
          createdAt: new Date(reaction.created_at)
        })) || [],
        comments: post.comments?.map((comment: any) => ({
          id: comment.id,
          userId: comment.user_id,
          user: {
            id: comment.user.id,
            name: comment.user.name,
            username: comment.user.username,
            email: comment.user.email,
            photoURL: comment.user.avatar || '',
            avatar: comment.user.avatar || '',
            createdAt: new Date(comment.user.created_at)
          },
          postId: comment.post_id,
          content: comment.content,
          createdAt: new Date(comment.created_at)
        })) || [],
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
        content: data.content,
        imageUrl: data.image_url,
        videoUrl: data.video_url,
        mediaType: (data.media_type || 'text') as 'text' | 'image' | 'video',
        isReel: data.is_reel || false,
        musicId: data.music_id,
        likes: [],
        reactions: [],
        comments: [],
        hashtags: [],
        createdAt: new Date(data.created_at)
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

  // Chat methods
  async getChats(): Promise<Chat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants(
            user:profiles(*)
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data?.map(chat => ({
        id: chat.id,
        participants: chat.chat_participants?.map((cp: any) => ({
          id: cp.user.id,
          name: cp.user.name,
          username: cp.user.username,
          email: cp.user.email,
          photoURL: cp.user.avatar || '',
          avatar: cp.user.avatar || '',
          createdAt: new Date(cp.user.created_at)
        })) || [],
        isGroup: chat.is_group || false,
        name: chat.name,
        lastActivity: new Date(chat.updated_at),
        createdAt: new Date(chat.created_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  async getMessages(chatId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(message => ({
        id: message.id,
        chatId: message.chat_id,
        userId: message.user_id,
        user: {
          id: message.user.id,
          name: message.user.name,
          username: message.user.username,
          email: message.user.email,
          photoURL: message.user.avatar || '',
          avatar: message.user.avatar || '',
          createdAt: new Date(message.user.created_at)
        },
        content: message.content,
        type: message.type as 'text' | 'image' | 'video' | 'voice',
        mediaUrl: message.media_url,
        duration: message.duration,
        timestamp: new Date(message.created_at),
        seen: message.seen || false
      })) || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, content: string): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content
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
        chatId: data.chat_id,
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
        type: 'text',
        timestamp: new Date(data.created_at),
        seen: false
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Custom emoji methods
  async getCustomEmojis(): Promise<CustomEmoji[]> {
    try {
      const { data, error } = await supabase
        .from('custom_emojis')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(emoji => ({
        id: emoji.id,
        name: emoji.name,
        imageUrl: emoji.image_url,
        createdBy: emoji.created_by,
        isPublic: emoji.is_public,
        createdAt: new Date(emoji.created_at)
      })) || [];
    } catch (error) {
      console.error('Error fetching custom emojis:', error);
      return [];
    }
  }

  // Site settings methods
  async getSiteLogo(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_logo')
        .single();

      if (error) return '';
      return data?.setting_value || '';
    } catch (error) {
      console.error('Error fetching site logo:', error);
      return '';
    }
  }

  async updateSiteLogo(logoUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'site_logo',
          setting_value: logoUrl
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating site logo:', error);
      throw error;
    }
  }

  // Friend methods
  async sendFriendRequest(userId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('friends')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();
