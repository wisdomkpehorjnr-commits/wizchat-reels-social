import { supabase } from '@/integrations/supabase/client';
import { User, Follow, SavedPost } from '@/types';

export class ProfileService {
  static async updateProfile(updates: Partial<User>): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        username: updates.username,
        bio: updates.bio,
        location: updates.location,
        website: updates.website,
        birthday: updates.birthday ? updates.birthday.toISOString().split('T')[0] : null,
        gender: updates.gender,
        pronouns: updates.pronouns,
        avatar: updates.avatar,
        cover_image: updates.coverImage,
        is_private: updates.isPrivate
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    const profile = data as any;
    return {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      photoURL: profile.avatar || '',
      avatar: profile.avatar || '',
      bio: profile.bio || undefined,
      location: profile.location || undefined,
      website: profile.website || undefined,
      birthday: profile.birthday ? new Date(profile.birthday) : undefined,
      gender: profile.gender || undefined,
      pronouns: profile.pronouns || undefined,
      coverImage: profile.cover_image || undefined,
      isPrivate: profile.is_private || false,
      followerCount: profile.follower_count || 0,
      followingCount: profile.following_count || 0,
      profileViews: profile.profile_views || 0,
      createdAt: new Date(profile.created_at)
    };
  }

  static async followUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get follower's profile for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    // Use the follows table (not friends)
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: userId
      });

    if (error) throw error;

    // Send notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'follow',
        title: 'New Follower',
        message: `${profile?.name || 'Someone'} is now following you!`,
        is_read: false
      });
  }

  static async unfollowUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
  }

  static async isFollowing(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    return !error && !!data;
  }

  static async getFollowers(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        *,
        follower:profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId);

    if (error) throw error;

    return data?.map(follow => {
      const followerProfile = follow.follower as any;
      return {
        id: follow.id,
        followerId: follow.follower_id,
        followingId: follow.following_id,
        follower: {
          id: followerProfile.id,
          name: followerProfile.name,
          username: followerProfile.username,
          email: followerProfile.email,
          photoURL: followerProfile.avatar || '',
          avatar: followerProfile.avatar || '',
          bio: followerProfile.bio || undefined,
          location: followerProfile.location || undefined,
          website: followerProfile.website || undefined,
          birthday: followerProfile.birthday ? new Date(followerProfile.birthday) : undefined,
          gender: followerProfile.gender || undefined,
          pronouns: followerProfile.pronouns || undefined,
          coverImage: followerProfile.cover_image || undefined,
          isPrivate: followerProfile.is_private || false,
          followerCount: followerProfile.follower_count || 0,
          followingCount: followerProfile.following_count || 0,
          profileViews: followerProfile.profile_views || 0,
          createdAt: new Date(followerProfile.created_at)
        },
        following: {} as User,
        createdAt: new Date(follow.created_at)
      };
    }) || [];
  }

  static async getFollowing(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        *,
        following:profiles!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId);

    if (error) throw error;

    return data?.map(follow => {
      const followingProfile = follow.following as any;
      return {
        id: follow.id,
        followerId: follow.follower_id,
        followingId: follow.following_id,
        follower: {} as User,
        following: {
          id: followingProfile.id,
          name: followingProfile.name,
          username: followingProfile.username,
          email: followingProfile.email,
          photoURL: followingProfile.avatar || '',
          avatar: followingProfile.avatar || '',
          bio: followingProfile.bio || undefined,
          location: followingProfile.location || undefined,
          website: followingProfile.website || undefined,
          birthday: followingProfile.birthday ? new Date(followingProfile.birthday) : undefined,
          gender: followingProfile.gender || undefined,
          pronouns: followingProfile.pronouns || undefined,
          coverImage: followingProfile.cover_image || undefined,
          isPrivate: followingProfile.is_private || false,
          followerCount: followingProfile.follower_count || 0,
          followingCount: followingProfile.following_count || 0,
          profileViews: followingProfile.profile_views || 0,
          createdAt: new Date(followingProfile.created_at)
        },
        createdAt: new Date(follow.created_at)
      };
    }) || [];
  }

  static async savePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('saved_posts')
      .insert({
        user_id: user.id,
        post_id: postId
      });

    if (error) throw error;
  }

  static async unsavePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (error) throw error;
  }

  static async getSavedPosts(): Promise<SavedPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        *,
        post:posts(
          *,
          user:profiles(*),
          likes:likes(*),
          comments:comments(
            *,
            user:profiles(*)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(savedPost => {
      const post = savedPost.post as any;
      const postUser = post.user as any;
      
      return {
        id: savedPost.id,
        userId: savedPost.user_id,
        postId: savedPost.post_id,
        post: {
          id: post.id,
          userId: post.user_id,
          user: {
            id: postUser.id,
            name: postUser.name,
            username: postUser.username,
            email: postUser.email,
            photoURL: postUser.avatar || '',
            avatar: postUser.avatar || '',
            bio: postUser.bio || undefined,
            location: postUser.location || undefined,
            website: postUser.website || undefined,
            birthday: postUser.birthday ? new Date(postUser.birthday) : undefined,
            gender: postUser.gender || undefined,
            pronouns: postUser.pronouns || undefined,
            coverImage: postUser.cover_image || undefined,
            isPrivate: postUser.is_private || false,
            followerCount: postUser.follower_count || 0,
            followingCount: postUser.following_count || 0,
            profileViews: postUser.profile_views || 0,
            createdAt: new Date(postUser.created_at)
          },
          content: post.content,
          imageUrl: post.image_url,
          videoUrl: post.video_url,
          mediaType: post.media_type as 'text' | 'image' | 'video',
          isReel: post.is_reel,
          musicId: post.music_id,
          likes: post.likes?.map((like: any) => like.user_id) || [],
          reactions: [],
          comments: post.comments?.map((comment: any) => {
            const commentUser = comment.user as any;
            return {
              id: comment.id,
              userId: comment.user_id,
              user: {
                id: commentUser.id,
                name: commentUser.name,
                username: commentUser.username,
                email: commentUser.email,
                photoURL: commentUser.avatar || '',
                avatar: commentUser.avatar || '',
                bio: commentUser.bio || undefined,
                location: commentUser.location || undefined,
                website: commentUser.website || undefined,
                birthday: commentUser.birthday ? new Date(commentUser.birthday) : undefined,
                gender: commentUser.gender || undefined,
                pronouns: commentUser.pronouns || undefined,
                coverImage: commentUser.cover_image || undefined,
                isPrivate: commentUser.is_private || false,
                followerCount: commentUser.follower_count || 0,
                followingCount: commentUser.following_count || 0,
                profileViews: commentUser.profile_views || 0,
                createdAt: new Date(commentUser.created_at)
              },
              postId: comment.post_id,
              content: comment.content,
              createdAt: new Date(comment.created_at)
            };
          }) || [],
          hashtags: [],
          createdAt: new Date(post.created_at)
        },
        createdAt: new Date(savedPost.created_at)
      };
    }) || [];
  }
}
