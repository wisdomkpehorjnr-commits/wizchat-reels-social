
import { User, Post, Chat, Message } from '@/types';
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

  async getUsers(): Promise<User[]> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      return profiles?.map(profile => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        photoURL: profile.avatar || '',
        avatar: profile.avatar || '',
        createdAt: new Date(profile.created_at)
      })) || [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Post methods
  async getPosts(): Promise<Post[]> {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          ),
          likes (
            id,
            user_id,
            created_at
          ),
          comments (
            id,
            user_id,
            content,
            created_at,
            profiles!comments_user_id_fkey (
              id,
              name,
              username,
              email,
              avatar,
              created_at
            )
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
        isReel: post.is_reel || false,
        likes: post.likes?.map((like: any) => like.user_id) || [],
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

  async createPost(postData: { content: string; imageFile?: File; videoFile?: File; isReel?: boolean }): Promise<Post> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postData.content,
          is_reel: postData.isReel || false
        })
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          )
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
        isReel: post.is_reel || false,
        likes: [],
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

      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          post_id: postId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async unlikePost(postId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unliking post:', error);
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
              id,
              name,
              username,
              email,
              avatar,
              created_at
            )
          ),
          messages (
            id,
            content,
            created_at,
            profiles!messages_user_id_fkey (
              id,
              name,
              username,
              email,
              avatar,
              created_at
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
            id,
            name,
            username,
            email,
            avatar,
            created_at
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
        type: message.type as 'text' | 'image' | 'video',
        mediaUrl: message.media_url,
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
            id,
            name,
            username,
            email,
            avatar,
            created_at
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
        type: message.type as 'text' | 'image' | 'video',
        mediaUrl: message.media_url,
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

      // Add participants to the chat
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
