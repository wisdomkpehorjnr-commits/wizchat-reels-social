import { supabase } from '@/integrations/supabase/client';
import { Post, User, Comment, Reaction, Chat, Message, MessageReaction } from '@/types';

export const dataService = {
  async getPosts(): Promise<Post[]> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        ),
        comments:comments (
          id,
          user_id,
          post_id,
          content,
          created_at,
          user:user_id (
            id,
            name,
            username,
            email,
            avatar
          )
        ),
        likes:likes (
          id,
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    return data.map((post: any) => {
      const likes = (post.likes as any[]) || [];
      const isLiked = currentUser ? likes.some(like => like.user_id === currentUser.id) : false;
      
      // Convert single image_url to imageUrls array for consistency in rendering
      let imageUrls = undefined;
      let imageUrl = post.image_url;
      
      if (post.image_url) {
        imageUrls = [post.image_url];
      }
      
      console.log('Post data:', {
        id: post.id,
        image_url: post.image_url,
        imageUrls: imageUrls,
        media_type: post.media_type
      });
      
      return {
        id: post.id,
        userId: post.user_id,
        user: post.user as User,
        content: post.content,
        imageUrl: imageUrl,
        imageUrls: imageUrls,
        videoUrl: post.video_url,
        mediaType: post.media_type as 'text' | 'image' | 'video',
        isReel: post.is_reel,
        likes: likes,
        likeCount: likes.length,
        isLiked: isLiked,
        comments: (post.comments as any[]).map(comment => ({
          id: comment.id,
          userId: comment.user_id,
          user: comment.user as User,
          postId: comment.post_id,
          content: comment.content,
          createdAt: new Date(comment.created_at)
        })),
        reactions: [],
        hashtags: [],
        createdAt: new Date(post.created_at)
      };
    });
  },

  async createPost(postData: any): Promise<Post> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('Creating post with data:', postData);

    // Simple, reliable insert data
    const insertData: any = {
      user_id: user.id,
      content: postData.content || '',
      media_type: postData.mediaType || 'text',
      is_reel: postData.isReel || false
    };

    // Handle images - store first image in image_url column
    if (postData.imageUrls && Array.isArray(postData.imageUrls) && postData.imageUrls.length > 0) {
      // Store first image URL (the database only has image_url column, not image_urls)
      insertData.image_url = postData.imageUrls[0];
      insertData.media_type = 'image';
      console.log('Setting image_url to first image:', insertData.image_url);
    } else if (postData.imageUrl) {
      insertData.image_url = postData.imageUrl;
      insertData.media_type = 'image';
      console.log('Setting image_url:', insertData.image_url);
    }

    // Handle video
    if (postData.videoUrl) {
      insertData.video_url = postData.videoUrl;
      insertData.media_type = 'video';
    }

    console.log('Insert data:', insertData);

    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      throw error;
    }

    console.log('Post created successfully:', data.id);
    console.log('Created post data:', data);

    // Convert single image_url to imageUrls array for consistency
    let imageUrls = undefined;
    if (data.image_url) {
      imageUrls = [data.image_url];
      console.log('Setting imageUrls from image_url:', imageUrls);
    }

    return {
      id: data.id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      imageUrl: data.image_url,
      imageUrls: imageUrls,
      videoUrl: data.video_url,
      mediaType: data.media_type as 'text' | 'image' | 'video',
      isReel: data.is_reel,
      likes: [],
      comments: [],
      reactions: [],
      hashtags: [],
      createdAt: new Date(data.created_at)
    };
  },

  async likePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (error) throw error;
    }
  },

  async unlikePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  },

  async getLikes(postId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching likes:', error);
      throw error;
    }

    return data.map(like => ({
      id: like.id,
      postId: like.post_id,
      userId: like.user_id,
      user: like.user,
      createdAt: new Date(like.created_at)
    }));
  },

  async savePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if post is already saved
    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingSave) {
      // Unsave
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Save
      const { error } = await supabase
        .from('saved_posts')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (error) throw error;
    }
  },

  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    return data.map(comment => ({
      id: comment.id,
      userId: comment.user_id,
      user: comment.user as User,
      postId: comment.post_id,
      content: comment.content,
      createdAt: new Date(comment.created_at)
    }));
  },

  async createComment(postId: string, content: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content
      })
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      throw error;
    }

    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      content: data.content,
      user: data.user as User,
      createdAt: new Date(data.created_at)
    };
  },

  async reactToPost(postId: string, emoji: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('reactions')
      .insert({
        post_id: postId,
        user_id: user.id,
        emoji: emoji
      });

    if (error) {
      console.error('Error reacting to post:', error);
      throw error;
    }
  },

  async getFriends(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        requester:profiles!friends_requester_id_fkey (
          id,
          name,
          username,
          email,
          avatar
        ),
        addressee:profiles!friends_addressee_id_fkey (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  
    if (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  
    return data.map(friend => ({
      id: friend.id,
      requesterId: friend.requester_id,
      addresseeId: friend.addressee_id,
      status: friend.status,
      createdAt: new Date(friend.created_at),
      updatedAt: new Date(friend.updated_at),
      requester: friend.requester as User,
      addressee: friend.addressee as User,
    }));
  },

  async searchUsers(searchTerm: string): Promise<User[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);
  
    if (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  
    return data.map(profile => ({
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      photoURL: profile.avatar,
      avatar: profile.avatar,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      birthday: profile.birthday ? new Date(profile.birthday) : undefined,
      gender: profile.gender,
      pronouns: profile.pronouns,
      coverImage: profile.cover_image,
      isPrivate: profile.is_private,
      followerCount: profile.follower_count,
      followingCount: profile.following_count,
      profileViews: profile.profile_views,
      createdAt: new Date(profile.created_at),
    }));
  },

  async sendFriendRequest(addresseeId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { error } = await supabase
      .from('friends')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      });
  
    if (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  async acceptFriendRequest(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendId)
      .eq('addressee_id', user.id);
  
    if (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  async unfriend(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendId);
  
    if (error) {
      console.error('Error unfriending user:', error);
      throw error;
    }
  },

  async createNotification(userId: string, type: string, title: string, message: string, data?: any): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  async checkIfFollowing(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    return !!data;
  },

  async getNotifications(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
  
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  
    return data.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.is_read,
      createdAt: new Date(notification.created_at)
    }));
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
  
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
  
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async updatePost(postId: string, updates: { content?: string; imageUrl?: string; videoUrl?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePost(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async updateStory(storyId: string, updates: { content?: string; mediaUrl?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('stories')
      .update(updates)
      .eq('id', storyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStory(storyId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getChats(): Promise<Chat[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      // First get chats where user is a participant
      const { data: userChats, error: chatError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (chatError) {
        console.error('Error fetching user chats:', chatError);
        throw chatError;
      }

      if (!userChats || userChats.length === 0) return [];

      const chatIds = userChats.map(uc => uc.chat_id);

      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants (
            user_id,
            role,
            joined_at,
            profiles (
              id,
              name,
              username,
              email,
              avatar
            )
          )
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(chat => {
        // Get all participants including current user for proper chat identification
        const allParticipants = (chat.chat_participants as any[])?.map(p => ({
          id: p.profiles.id,
          name: p.profiles.name,
          username: p.profiles.username,
          email: p.profiles.email,
          photoURL: p.profiles.avatar,
          avatar: p.profiles.avatar,
          bio: '',
          followerCount: 0,
          followingCount: 0,
          profileViews: 0,
          createdAt: new Date(),
          role: p.role
        })) as User[] || [];

        // For display purposes, show other participants (not current user)
        const displayParticipants = allParticipants.filter(p => p.id !== user.id);

        return {
          id: chat.id,
          participants: displayParticipants,
          allParticipants: allParticipants, // Keep all participants for matching
          isGroup: chat.is_group || false,
          name: chat.name,
          description: chat.description,
          avatar: chat.avatar_url,
          lastActivity: new Date(chat.updated_at || chat.created_at),
          createdAt: new Date(chat.created_at),
          creatorId: chat.creator_id,
          inviteCode: chat.invite_code,
          isPublic: chat.is_public,
          memberCount: chat.member_count,
          unreadCount: 0,
          lastMessage: null
        };
      });
    } catch (error) {
      console.error('Error in getChats:', error);
      throw error;
    }
  },

  async createChat(participantIds: string[], isGroup: boolean = false, name?: string, description?: string): Promise<Chat> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data: chatId, error } = await supabase.rpc('create_chat_with_participants', {
        p_participant_ids: participantIds,
        p_is_group: isGroup,
        p_name: name,
        p_description: description
      });

      if (error) {
        console.error('Error creating chat:', error);
        throw new Error(`Failed to create chat: ${error.message}`);
      }

      const { data: chatData, error: fetchError } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants (
            user_id,
            role,
            joined_at,
            profiles (
              id,
              name,
              username,
              avatar,
              email
            )
          )
        `)
        .eq('id', chatId)
        .single();

      if (fetchError) {
        console.error('Error fetching created chat:', fetchError);
        throw new Error('Failed to fetch created chat');
      }

      const participants_data = chatData.chat_participants?.map((p: any) => ({
        id: p.profiles.id,
        name: p.profiles.name,
        username: p.profiles.username,
        avatar: p.profiles.avatar,
        email: p.profiles.email,
        photoURL: p.profiles.avatar,
        bio: '',
        followerCount: 0,
        followingCount: 0,
        profileViews: 0,
        createdAt: new Date(),
        role: p.role
      })) || [];

      return {
        id: chatData.id,
        name: chatData.name,
        isGroup: chatData.is_group,
        participants: participants_data as User[],
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date(chatData.created_at),
        lastActivity: new Date(chatData.created_at),
        avatar: chatData.avatar_url
      };
    } catch (error) {
      console.error('Chat creation failed:', error);
      throw error;
    }
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:profiles!messages_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data.map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      userId: msg.user_id,
      user: msg.user as User,
      content: msg.content,
      type: msg.type as 'text' | 'voice' | 'image' | 'video',
      mediaUrl: msg.media_url,
      duration: msg.duration,
      seen: msg.seen,
      timestamp: new Date(msg.created_at)
    }));
  },

  async sendMessage(chatId: string, content: string): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: user.id,
        content: content,
        type: 'text'
      })
      .select(`
        *,
        user:profiles!messages_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'text',
      mediaUrl: data.media_url,
      duration: data.duration,
      seen: data.seen,
      timestamp: new Date(data.created_at)
    };
  },

  async createVoiceMessage(chatId: string, audioUrl: string, duration: number): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: user.id,
        content: '',
        type: 'voice',
        media_url: audioUrl,
        duration: duration
      })
      .select(`
        *,
        user:profiles!messages_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error creating voice message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'voice',
      mediaUrl: data.media_url,
      duration: data.duration,
      seen: data.seen,
      timestamp: new Date(data.created_at)
    };
  },

  async createMediaMessage(chatId: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: user.id,
        content: '',
        type: mediaType,
        media_url: mediaUrl
      })
      .select(`
        *,
        user:profiles!messages_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error creating media message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'image' | 'video',
      mediaUrl: data.media_url,
      duration: data.duration,
      seen: data.seen,
      timestamp: new Date(data.created_at)
    };
  },

  async editMessage(messageId: string, newContent: string): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', messageId)
      .eq('user_id', user.id) // Only allow editing own messages
      .select(`
        *,
        user:profiles!messages_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error editing message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'text' | 'voice' | 'image' | 'video',
      mediaUrl: data.media_url,
      duration: data.duration,
      seen: data.seen,
      timestamp: new Date(data.created_at)
    };
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id); // Only allow deleting own messages

    if (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  async addMessageReaction(messageId: string, emoji: string): Promise<MessageReaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user already reacted with this emoji
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove existing reaction (toggle off)
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);
      
      throw new Error('Reaction removed');
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }

    return {
      id: data.id,
      messageId: data.message_id,
      userId: data.user_id,
      emoji: data.emoji,
      createdAt: new Date(data.created_at)
    };
  },

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
      throw error;
    }

    // Fetch user data separately if needed
    const reactionsWithUsers = await Promise.all(
      data.map(async (reaction) => {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, name, username, avatar')
          .eq('id', reaction.user_id)
          .single();

        return {
          id: reaction.id,
          messageId: reaction.message_id,
          userId: reaction.user_id,
          user: userData as User | undefined,
          emoji: reaction.emoji,
          createdAt: new Date(reaction.created_at)
        };
      })
    );

    return reactionsWithUsers;
  },

  async removeMessageReaction(reactionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  },

  async pinMessage(chatId: string, messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('pinned_messages')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        pinned_by: user.id
      });

    if (error) {
      console.error('Error pinning message:', error);
      throw error;
    }
  },

  async unpinMessage(chatId: string, messageId: string): Promise<void> {
    const { error } = await supabase
      .from('pinned_messages')
      .delete()
      .eq('chat_id', chatId)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error unpinning message:', error);
      throw error;
    }
  },

  async getPinnedMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('pinned_messages')
      .select(`
        message_id,
        messages (
          *,
          user:profiles!messages_user_id_fkey (
            id,
            name,
            username,
            avatar
          )
        )
      `)
      .eq('chat_id', chatId);

    if (error) {
      console.error('Error fetching pinned messages:', error);
      throw error;
    }

    return data.map((item: any) => {
      const msg = item.messages;
      return {
        id: msg.id,
        chatId: msg.chat_id,
        userId: msg.user_id,
        user: msg.user as User,
        content: msg.content,
        type: msg.type as 'text' | 'voice' | 'image' | 'video',
        mediaUrl: msg.media_url,
        duration: msg.duration,
        seen: msg.seen,
        timestamp: new Date(msg.created_at),
        isPinned: true
      };
    });
  },



  async createGroup(groupData: { name: string; description: string; isPublic: boolean; members: string[] }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        is_private: !groupData.isPublic,
        created_by: user.id,
        invite_code: Math.random().toString(36).substring(2, 15),
        member_count: groupData.members.length + 1
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      throw groupError;
    }

    const allMembers = [user.id, ...groupData.members];
    const memberInserts = allMembers.map(memberId => ({
      group_id: group.id,
      user_id: memberId,
      role: memberId === user.id ? 'admin' : 'member'
    }));

    const { error: memberError } = await supabase
      .from('group_members')
      .insert(memberInserts);

    if (memberError) {
      console.error('Error adding group members:', memberError);
      throw memberError;
    }

    return group;
  },

  async joinTopicRoom(roomId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upsert (insert if not exists; don't fail if exists)
    const { error } = await supabase
      .from('room_participants')
      .upsert([
        { room_id: roomId, user_id: user.id }
      ], { onConflict: 'room_id,user_id' });
    if (error) {
      console.error('Failed to insert/join room:', error);
      throw new Error(error.message || 'Failed to join topic (insert)');
    }
    // Confirm join exists (retry if needed, since RLS policies may delay insert visibility)
    let joined = false;
    let details = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(res => setTimeout(res, 250));
      const { data, error } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      if (data) { joined = true; break; }
      details = error;
    }
    if (!joined) {
      console.error('Join confirmation failed!', details);
      throw new Error('Failed to confirm join. Please try again or relogin.');
    }
  },

  async getCustomEmojis(): Promise<any[]> {
    const { data, error } = await supabase
      .from('custom_emojis')
      .select('*')
      .eq('is_public', true);

    if (error) {
      console.error('Error fetching custom emojis:', error);
      throw error;
    }

    return data.map(emoji => ({
      id: emoji.id,
      name: emoji.name,
      imageUrl: emoji.image_url,
      createdBy: emoji.created_by,
      isPublic: emoji.is_public,
      createdAt: new Date(emoji.created_at)
    }));
  },

  async getSiteLogo(): Promise<string> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'site_logo')
      .single();

    if (error) {
      console.error('Error fetching site logo:', error);
      return '';
    }

    return data.setting_value || '';
  },

  async updateSiteLogo(logoUrl: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('site_settings')
      .upsert({
        setting_key: 'site_logo',
        setting_value: logoUrl,
        updated_by: user.id
      });

    if (error) {
      console.error('Error updating site logo:', error);
      throw error;
    }
  },

  addComment: async (postId: string, content: string): Promise<Comment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content
      })
      .select(`
        *,
        user:user_id (
          id,
          name,
          username,
          email,
          avatar
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    return {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      content: data.content,
      user: {
        ...data.user,
        photoURL: data.user.avatar,
        followerCount: 0,
        followingCount: 0,
        profileViews: 0,
        createdAt: new Date()
      } as User,
      createdAt: new Date(data.created_at)
    };
  },
};