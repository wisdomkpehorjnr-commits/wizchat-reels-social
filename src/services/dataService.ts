import { User, Post, Chat, Message, Friend, Reaction, CustomEmoji, SiteSetting } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export class DataService {
  private static instance: DataService;
  
  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // User methods
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
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const { data } = await supabase.rpc('search_users', { 
        search_term: searchTerm 
      });

      return data?.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        photoURL: profile.avatar || '',
        avatar: profile.avatar || '',
        createdAt: new Date(profile.created_at)
      })) || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Friend system methods
  async sendFriendRequest(addresseeId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('friends')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  async acceptFriendRequest(friendId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendId);

      if (error) throw error;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  async getFriends(): Promise<Friend[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: friends } = await supabase
        .from('friends')
        .select(`
          *,
          requester:profiles!friends_requester_id_fkey(id, name, username, email, avatar, created_at),
          addressee:profiles!friends_addressee_id_fkey(id, name, username, email, avatar, created_at)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      return friends?.map(friend => ({
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
      console.error('Error getting friends:', error);
      return [];
    }
  }

  // Enhanced post methods with reactions
  async getPosts(): Promise<Post[]> {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id, name, username, email, avatar, created_at
          ),
          likes (id, user_id, created_at),
          reactions (
            id, user_id, emoji, created_at,
            profiles!reactions_user_id_fkey (id, name, username, email, avatar, created_at)
          ),
          comments (
            id, user_id, content, created_at,
            profiles!comments_user_id_fkey (id, name, username, email, avatar, created_at)
          )
        `)
        .order('created_at', { ascending: false });

      return posts?.map(post => ({
        id: post.id,
        userId: post.user_id,
        user: {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          email: post.profiles.email,
          photoURL: post.profiles.avatar || '',
          avatar: post.profiles.avatar || '',
          createdAt: new Date(post.profiles.created_at)
        },
        content: post.content,
        imageUrl: post.image_url,
        videoUrl: post.video_url,
        mediaType: (post.media_type || 'text') as 'text' | 'image' | 'video',
        isReel: post.is_reel || false,
        likes: post.likes?.map((like: any) => like.user_id) || [],
        reactions: post.reactions?.map((reaction: any) => ({
          id: reaction.id,
          userId: reaction.user_id,
          user: {
            id: reaction.profiles.id,
            name: reaction.profiles.name,
            username: reaction.profiles.username,
            email: reaction.profiles.email,
            photoURL: reaction.profiles.avatar || '',
            avatar: reaction.profiles.avatar || '',
            createdAt: new Date(reaction.profiles.created_at)
          },
          postId: post.id,
          emoji: reaction.emoji,
          createdAt: new Date(reaction.created_at)
        })) || [],
        comments: post.comments?.map((comment: any) => ({
          id: comment.id,
          userId: comment.user_id,
          user: {
            id: comment.profiles.id,
            name: comment.profiles.name,
            username: comment.profiles.username,
            email: comment.profiles.email,
            photoURL: comment.profiles.avatar || '',
            avatar: comment.profiles.avatar || '',
            createdAt: new Date(comment.profiles.created_at)
          },
          postId: post.id,
          content: comment.content,
          createdAt: new Date(comment.created_at)
        })) || [],
        createdAt: new Date(post.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  async createPost(postData: { content: string; imageFile?: File; videoFile?: File; mediaType?: 'text' | 'image' | 'video'; isReel?: boolean }): Promise<Post> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postData.content,
          media_type: postData.mediaType || 'text',
          is_reel: postData.isReel || false
        })
        .select(`
          *,
          profiles!posts_user_id_fkey (id, name, username, email, avatar, created_at)
        `)
        .single();

      if (error) throw error;

      return {
        id: post.id,
        userId: post.user_id,
        user: {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          email: post.profiles.email,
          photoURL: post.profiles.avatar || '',
          avatar: post.profiles.avatar || '',
          createdAt: new Date(post.profiles.created_at)
        },
        content: post.content,
        imageUrl: post.image_url,
        videoUrl: post.video_url,
        mediaType: (post.media_type || 'text') as 'text' | 'image' | 'video',
        isReel: post.is_reel || false,
        likes: [],
        reactions: [],
        comments: [],
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

  // Custom emoji methods
  async getCustomEmojis(): Promise<CustomEmoji[]> {
    try {
      const { data: emojis } = await supabase
        .from('custom_emojis')
        .select('*')
        .order('created_at', { ascending: false });

      return emojis?.map(emoji => ({
        id: emoji.id,
        name: emoji.name,
        imageUrl: emoji.image_url,
        createdBy: emoji.created_by,
        isPublic: emoji.is_public,
        createdAt: new Date(emoji.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting custom emojis:', error);
      return [];
    }
  }

  // Voice message methods
  async sendVoiceMessage(chatId: string, audioBlob: Blob, duration: number): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // In a real implementation, you'd upload the audio file to storage first
      // For now, we'll just create the message record
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content: 'Voice message',
          type: 'voice',
          duration: duration
        })
        .select(`
          *,
          profiles!messages_user_id_fkey (id, name, username, email, avatar, created_at)
        `)
        .single();

      if (error) throw error;

      return {
        id: message.id,
        chatId: message.chat_id,
        userId: message.user_id,
        user: {
          id: message.profiles.id,
          name: message.profiles.name,
          username: message.profiles.username,
          email: message.profiles.email,
          photoURL: message.profiles.avatar || '',
          avatar: message.profiles.avatar || '',
          createdAt: new Date(message.profiles.created_at)
        },
        content: message.content,
        type: message.type as 'text' | 'image' | 'video' | 'voice',
        mediaUrl: message.media_url,
        duration: message.duration,
        timestamp: new Date(message.created_at),
        seen: message.seen || false
      };
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  }

  // Site settings methods
  async getSiteLogo(): Promise<string> {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_logo')
        .single();

      return data?.setting_value || '/lovable-uploads/15358747-e2da-431c-a6b1-721eb6914fc8.png';
    } catch (error) {
      console.error('Error getting site logo:', error);
      return '/lovable-uploads/15358747-e2da-431c-a6b1-721eb6914fc8.png';
    }
  }

  async updateSiteLogo(logoUrl: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'site_logo',
          setting_value: logoUrl,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating site logo:', error);
      throw error;
    }
  }

  // Chat methods
  async getChats(): Promise<Chat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: chats } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner (
            user_id,
            profiles!chat_participants_user_id_fkey (
              id, name, username, email, avatar, created_at
            )
          ),
          messages (
            id, content, created_at,
            profiles!messages_user_id_fkey (
              id, name, username, email, avatar, created_at
            )
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      return chats?.map(chat => ({
        id: chat.id,
        participants: chat.chat_participants.map((participant: any) => ({
          id: participant.profiles.id,
          name: participant.profiles.name,
          username: participant.profiles.username,
          email: participant.profiles.email,
          photoURL: participant.profiles.avatar || '',
          avatar: participant.profiles.avatar || '',
          createdAt: new Date(participant.profiles.created_at)
        })),
        isGroup: chat.is_group || false,
        name: chat.name,
        lastMessage: chat.messages?.length > 0 ? {
          id: chat.messages[0].id,
          chatId: chat.id,
          userId: chat.messages[0].profiles.id,
          user: {
            id: chat.messages[0].profiles.id,
            name: chat.messages[0].profiles.name,
            username: chat.messages[0].profiles.username,
            email: chat.messages[0].profiles.email,
            photoURL: chat.messages[0].profiles.avatar || '',
            avatar: chat.messages[0].profiles.avatar || '',
            createdAt: new Date(chat.messages[0].profiles.created_at)
          },
          content: chat.messages[0].content,
          type: 'text' as const,
          timestamp: new Date(chat.messages[0].created_at),
          seen: false
        } : undefined,
        lastActivity: new Date(chat.updated_at),
        createdAt: new Date(chat.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  async getMessages(chatId: string): Promise<Message[]> {
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_user_id_fkey (
            id, name, username, email, avatar, created_at
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      return messages?.map(message => ({
        id: message.id,
        chatId: message.chat_id,
        userId: message.user_id,
        user: {
          id: message.profiles.id,
          name: message.profiles.name,
          username: message.profiles.username,
          email: message.profiles.email,
          photoURL: message.profiles.avatar || '',
          avatar: message.profiles.avatar || '',
          createdAt: new Date(message.profiles.created_at)
        },
        content: message.content,
        type: message.type as 'text' | 'image' | 'video' | 'voice',
        mediaUrl: message.media_url,
        duration: message.duration,
        timestamp: new Date(message.created_at),
        seen: message.seen || false
      })) || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async sendMessage(chatId: string, content: string): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content: content,
          type: 'text'
        })
        .select(`
          *,
          profiles!messages_user_id_fkey (
            id, name, username, email, avatar, created_at
          )
        `)
        .single();

      if (error) throw error;

      return {
        id: message.id,
        chatId: message.chat_id,
        userId: message.user_id,
        user: {
          id: message.profiles.id,
          name: message.profiles.name,
          username: message.profiles.username,
          email: message.profiles.email,
          photoURL: message.profiles.avatar || '',
          avatar: message.profiles.avatar || '',
          createdAt: new Date(message.profiles.created_at)
        },
        content: message.content,
        type: message.type as 'text' | 'image' | 'video' | 'voice',
        mediaUrl: message.media_url,
        duration: message.duration,
        timestamp: new Date(message.created_at),
        seen: message.seen || false
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async createChat(participants: string[], isGroup: boolean, name?: string): Promise<Chat> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: chat, error } = await supabase
        .from('chats')
        .insert({
          name: name,
          is_group: isGroup
        })
        .select()
        .single();

      if (error) throw error;

      const participantInserts = participants.map(participantId => ({
        chat_id: chat.id,
        user_id: participantId
      }));

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participantInserts);

      if (participantError) throw participantError;

      return {
        id: chat.id,
        participants: [],
        isGroup: chat.is_group || false,
        name: chat.name,
        lastActivity: new Date(chat.updated_at),
        createdAt: new Date(chat.created_at)
      };
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }
}

export const dataService = DataService.getInstance();
