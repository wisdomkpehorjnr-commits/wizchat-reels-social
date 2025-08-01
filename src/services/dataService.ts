import { supabase } from '@/integrations/supabase/client';
import { Post, User, Comment, Reaction, Chat, Message } from '@/types';

export const dataService = {
  async getPosts(): Promise<Post[]> {
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
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    return data.map(post => ({
      id: post.id,
      userId: post.user_id,
      user: post.user as User,
      content: post.content,
      imageUrl: post.image_url,
      videoUrl: post.video_url,
      mediaType: post.media_type as 'text' | 'image' | 'video',
      isReel: post.is_reel,
      likes: [], // You might need to fetch likes separately or include them in the initial query
      comments: (post.comments as any[]).map(comment => ({
        id: comment.id,
        userId: comment.user_id,
        user: comment.user as User,
        postId: comment.post_id,
        content: comment.content,
        createdAt: new Date(comment.created_at)
      })),
      reactions: [], // You might need to fetch reactions separately
      hashtags: [], // You might need to fetch hashtags separately
      createdAt: new Date(post.created_at)
    }));
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

    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        participants:chat_participants (
          user_id,
          role,
          user:user_id (
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

    return data.map(chat => ({
      id: chat.id,
      participants: (chat.participants as any[]).map(p => ({
        ...p.user,
        role: p.role
      })) as User[],
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
    }));
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
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
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data.map(message => ({
      id: message.id,
      chatId: message.chat_id,
      userId: message.user_id,
      user: message.user as User,
      content: message.content,
      type: message.type as 'text' | 'image' | 'video' | 'voice',
      mediaUrl: message.media_url,
      duration: message.duration,
      timestamp: new Date(message.created_at),
      seen: message.seen || false,
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
      console.error('Error sending message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'text' | 'image' | 'video' | 'voice',
      mediaUrl: data.media_url,
      duration: data.duration,
      timestamp: new Date(data.created_at),
      seen: data.seen || false,
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
        content: 'Voice message',
        type: 'voice',
        media_url: audioUrl,
        duration: duration
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
      console.error('Error creating voice message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'text' | 'image' | 'video' | 'voice',
      mediaUrl: data.media_url,
      duration: data.duration,
      timestamp: new Date(data.created_at),
      seen: data.seen || false,
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
        content: `${mediaType} message`,
        type: mediaType,
        media_url: mediaUrl
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
      console.error('Error creating media message:', error);
      throw error;
    }

    return {
      id: data.id,
      chatId: data.chat_id,
      userId: data.user_id,
      user: data.user as User,
      content: data.content,
      type: data.type as 'text' | 'image' | 'video' | 'voice',
      mediaUrl: data.media_url,
      duration: data.duration,
      timestamp: new Date(data.created_at),
      seen: data.seen || false,
    };
  },

  async createChat(participants: string[], isGroup: boolean = false, name?: string): Promise<Chat> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: isGroup,
        name: name,
        creator_id: user.id,
        member_count: participants.length + 1,
        is_public: false
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError);
      throw chatError;
    }

    // Add participants including the creator
    const allParticipants = [user.id, ...participants];
    const participantInserts = allParticipants.map(participantId => ({
      chat_id: chat.id,
      user_id: participantId,
      role: participantId === user.id ? 'admin' : 'member'
    }));

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts);

    if (participantsError) {
      console.error('Error adding chat participants:', participantsError);
      throw participantsError;
    }

    // Fetch participant profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', participants);

    if (profilesError) {
      console.error('Error fetching participant profiles:', profilesError);
      throw profilesError;
    }

    const participantUsers = profilesData?.map(profile => ({
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      photoURL: profile.avatar,
      avatar: profile.avatar,
      bio: profile.bio,
      followerCount: profile.follower_count,
      followingCount: profile.following_count,
      profileViews: profile.profile_views,
      createdAt: new Date(profile.created_at),
      role: 'member'
    })) || [];

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
    };
  },

  async createGroup(groupData: { name: string; description: string; isPublic: boolean; members: string[] }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create group
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

    // Add members
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

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return; // Already joined
    }

    // Join room
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
  }
};
