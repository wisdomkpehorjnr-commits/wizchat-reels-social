import { supabase } from '@/integrations/supabase/client';
import { Post, User, Comment, Reaction, Chat, Message } from '@/types';

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

    return data.map(post => {
      const likes = (post.likes as any[]) || [];
      const isLiked = currentUser ? likes.some(like => like.user_id === currentUser.id) : false;
      
      return {
        id: post.id,
        userId: post.user_id,
        user: post.user as User,
        content: post.content,
        imageUrl: post.image_url,
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

  async createPost(content: string, imageFile?: File, videoFile?: File, isReel: boolean = false): Promise<Post> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let imageUrl: string | undefined = undefined;
    let videoUrl: string | undefined = undefined;

    if (imageFile) {
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(`${user.id}/${Date.now()}-${imageFile.name}`, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      imageUrl = `https://cgydbjsuhwsnqsiskmex.supabase.co/storage/v1/object/public/posts/${data.path}`;
    }

    if (videoFile) {
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(`${user.id}/${Date.now()}-${videoFile.name}`, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      videoUrl = `https://cgydbjsuhwsnqsiskmex.supabase.co/storage/v1/object/public/posts/${data.path}`;
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content,
        image_url: imageUrl,
        video_url: videoUrl,
        media_type: imageFile ? 'image' : videoFile ? 'video' : 'text',
        is_reel: isReel
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
      console.error('Error creating post:', error);
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      imageUrl: data.image_url,
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
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        throw error;
      }

      if (!data) return [];

      return data.map(chat => {
        const participantUsers = (chat.chat_participants as any[])
          ?.filter(p => p.user_id !== user.id)
          .map(p => ({
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

        return {
          id: chat.id,
          participants: participantUsers,
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

    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return;
    }

    const { error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id
      });

    if (error) {
      console.error('Error joining room:', error);
      throw error;
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

  addComment: async (postId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};