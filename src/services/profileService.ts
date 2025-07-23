
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
        birthday: updates.birthday,
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

    return {
      id: data.id,
      name: data.name,
      username: data.username,
      email: data.email,
      photoURL: data.avatar || '',
      avatar: data.avatar || '',
      bio: data.bio,
      location: data.location,
      website: data.website,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
      gender: data.gender,
      pronouns: data.pronouns,
      coverImage: data.cover_image,
      isPrivate: data.is_private,
      followerCount: data.follower_count,
      followingCount: data.following_count,
      profileViews: data.profile_views,
      createdAt: new Date(data.created_at)
    };
  }

  static async followUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: userId
      });

    if (error) throw error;
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
      .single();

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

    return data?.map(follow => ({
      id: follow.id,
      followerId: follow.follower_id,
      followingId: follow.following_id,
      follower: {
        id: follow.follower.id,
        name: follow.follower.name,
        username: follow.follower.username,
        email: follow.follower.email,
        photoURL: follow.follower.avatar || '',
        avatar: follow.follower.avatar || '',
        bio: follow.follower.bio,
        location: follow.follower.location,
        website: follow.follower.website,
        birthday: follow.follower.birthday ? new Date(follow.follower.birthday) : undefined,
        gender: follow.follower.gender,
        pronouns: follow.follower.pronouns,
        coverImage: follow.follower.cover_image,
        isPrivate: follow.follower.is_private,
        followerCount: follow.follower.follower_count,
        followingCount: follow.follower.following_count,
        profileViews: follow.follower.profile_views,
        createdAt: new Date(follow.follower.created_at)
      },
      following: {} as User, // Not needed for followers list
      createdAt: new Date(follow.created_at)
    })) || [];
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

    return data?.map(follow => ({
      id: follow.id,
      followerId: follow.follower_id,
      followingId: follow.following_id,
      follower: {} as User, // Not needed for following list
      following: {
        id: follow.following.id,
        name: follow.following.name,
        username: follow.following.username,
        email: follow.following.email,
        photoURL: follow.following.avatar || '',
        avatar: follow.following.avatar || '',
        bio: follow.following.bio,
        location: follow.following.location,
        website: follow.following.website,
        birthday: follow.following.birthday ? new Date(follow.following.birthday) : undefined,
        gender: follow.following.gender,
        pronouns: follow.following.pronouns,
        coverImage: follow.following.cover_image,
        isPrivate: follow.following.is_private,
        followerCount: follow.following.follower_count,
        followingCount: follow.following.following_count,
        profileViews: follow.following.profile_views,
        createdAt: new Date(follow.following.created_at)
      },
      createdAt: new Date(follow.created_at)
    })) || [];
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

    return data?.map(savedPost => ({
      id: savedPost.id,
      userId: savedPost.user_id,
      postId: savedPost.post_id,
      post: {
        id: savedPost.post.id,
        userId: savedPost.post.user_id,
        user: {
          id: savedPost.post.user.id,
          name: savedPost.post.user.name,
          username: savedPost.post.user.username,
          email: savedPost.post.user.email,
          photoURL: savedPost.post.user.avatar || '',
          avatar: savedPost.post.user.avatar || '',
          bio: savedPost.post.user.bio,
          location: savedPost.post.user.location,
          website: savedPost.post.user.website,
          birthday: savedPost.post.user.birthday ? new Date(savedPost.post.user.birthday) : undefined,
          gender: savedPost.post.user.gender,
          pronouns: savedPost.post.user.pronouns,
          coverImage: savedPost.post.user.cover_image,
          isPrivate: savedPost.post.user.is_private,
          followerCount: savedPost.post.user.follower_count,
          followingCount: savedPost.post.user.following_count,
          profileViews: savedPost.post.user.profile_views,
          createdAt: new Date(savedPost.post.user.created_at)
        },
        content: savedPost.post.content,
        imageUrl: savedPost.post.image_url,
        videoUrl: savedPost.post.video_url,
        mediaType: savedPost.post.media_type as 'text' | 'image' | 'video',
        isReel: savedPost.post.is_reel,
        musicId: savedPost.post.music_id,
        likes: savedPost.post.likes?.map((like: any) => like.user_id) || [],
        reactions: [],
        comments: savedPost.post.comments?.map((comment: any) => ({
          id: comment.id,
          userId: comment.user_id,
          user: {
            id: comment.user.id,
            name: comment.user.name,
            username: comment.user.username,
            email: comment.user.email,
            photoURL: comment.user.avatar || '',
            avatar: comment.user.avatar || '',
            bio: comment.user.bio,
            location: comment.user.location,
            website: comment.user.website,
            birthday: comment.user.birthday ? new Date(comment.user.birthday) : undefined,
            gender: comment.user.gender,
            pronouns: comment.user.pronouns,
            coverImage: comment.user.cover_image,
            isPrivate: comment.user.is_private,
            followerCount: comment.user.follower_count,
            followingCount: comment.user.following_count,
            profileViews: comment.user.profile_views,
            createdAt: new Date(comment.user.created_at)
          },
          postId: comment.post_id,
          content: comment.content,
          createdAt: new Date(comment.created_at)
        })) || [],
        hashtags: [],
        createdAt: new Date(savedPost.post.created_at)
      },
      createdAt: new Date(savedPost.created_at)
    })) || [];
  }
}
