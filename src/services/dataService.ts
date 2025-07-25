import { supabase } from '@/integrations/supabase/client';
import { Post, User, Comment, Reaction } from '@/types';

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
          photo_url,
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
            photo_url,
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
      mediaType: post.media_type,
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
        .from('post-media')
        .upload(`${user.id}/${Date.now()}-${imageFile.name}`, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.Key}`;
    }

    if (videoFile) {
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(`${user.id}/${Date.now()}-${videoFile.name}`, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.Key}`;
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
          photo_url,
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
      mediaType: data.media_type,
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

    // Optimistically update the UI, but handle errors
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      });

    if (error) {
      console.error('Error liking post:', error);

      if (error.message.includes('duplicate')) {
        // If the user already liked the post, unlike it
        await this.unlikePost(postId);
      } else {
        throw error;
      }
    }
  },

  async unlikePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking post:', error);
      throw error;
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
          photo_url,
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
          photo_url,
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
      .from('post_reactions')
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
        requester:requester_id (
          id,
          name,
          username,
          email,
          photo_url,
          avatar
        ),
        addressee:addressee_id (
          id,
          name,
          username,
          email,
          photo_url,
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
  
    return data.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      photoURL: user.photo_url,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      website: user.website,
      birthday: user.birthday,
      gender: user.gender,
      pronouns: user.pronouns,
      coverImage: user.cover_image,
      isPrivate: user.is_private,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      profileViews: user.profile_views,
      createdAt: new Date(user.created_at),
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

  // Add missing methods
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

  async createChat(participantIds: string[], isGroup: boolean = false, name?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: isGroup,
        name: name,
        creator_id: profile.id,
        member_count: participantIds.length + 1
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add participants including the creator
    const participants = [profile.id, ...participantIds];
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(
        participants.map(participantId => ({
          chat_id: chat.id,
          user_id: participantId,
          role: participantId === profile.id ? 'admin' : 'member'
        }))
      );

    if (participantsError) throw participantsError;

    return chat;
  },

  async createGroup(name: string, description?: string, isPrivate: boolean = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        is_private: isPrivate,
        created_by: profile.id,
        invite_code: Math.random().toString(36).substring(2, 15)
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: profile.id,
        role: 'admin'
      });

    if (memberError) throw memberError;

    return group;
  },

  async joinTopicRoom(roomId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Join room
    const { error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: profile.id
      });

    if (error && !error.message.includes('duplicate')) throw error;

    // Update participant count
    const { error: updateError } = await supabase.rpc('increment_room_participants', {
      room_id: roomId
    });

    if (updateError) console.error('Error updating participant count:', updateError);
  }
};
