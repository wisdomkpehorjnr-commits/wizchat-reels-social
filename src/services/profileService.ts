
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
      bio: data.bio || undefined,
      location: data.location || undefined,
      website: data.website || undefined,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
      gender: data.gender || undefined,
      pronouns: data.pronouns || undefined,
      coverImage: data.cover_image || undefined,
      isPrivate: data.is_private || false,
      followerCount: data.follower_count || 0,
      followingCount: data.following_count || 0,
      profileViews: data.profile_views || 0,
      createdAt: new Date(data.created_at)
    };
  }

  static async followUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friends')
      .insert({
        requester_id: user.id,
        addressee_id: userId,
        status: 'accepted'
      });

    if (error) throw error;
  }

  static async unfollowUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('requester_id', user.id)
      .eq('addressee_id', userId);

    if (error) throw error;
  }

  static async isFollowing(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .eq('requester_id', user.id)
      .eq('addressee_id', userId)
      .eq('status', 'accepted')
      .single();

    return !error && !!data;
  }

  static async getFollowers(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        requester:profiles!friends_requester_id_fkey(*)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;

    return data?.map(friend => ({
      id: friend.id,
      followerId: friend.requester_id,
      followingId: friend.addressee_id,
      follower: {
        id: friend.requester.id,
        name: friend.requester.name,
        username: friend.requester.username,
        email: friend.requester.email,
        photoURL: friend.requester.avatar || '',
        avatar: friend.requester.avatar || '',
        bio: friend.requester.bio || undefined,
        location: friend.requester.location || undefined,
        website: friend.requester.website || undefined,
        birthday: friend.requester.birthday ? new Date(friend.requester.birthday) : undefined,
        gender: friend.requester.gender || undefined,
        pronouns: friend.requester.pronouns || undefined,
        coverImage: friend.requester.cover_image || undefined,
        isPrivate: friend.requester.is_private || false,
        followerCount: friend.requester.follower_count || 0,
        followingCount: friend.requester.following_count || 0,
        profileViews: friend.requester.profile_views || 0,
        createdAt: new Date(friend.requester.created_at)
      },
      following: {} as User,
      createdAt: new Date(friend.created_at)
    })) || [];
  }

  static async getFollowing(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        addressee:profiles!friends_addressee_id_fkey(*)
      `)
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;

    return data?.map(friend => ({
      id: friend.id,
      followerId: friend.requester_id,
      followingId: friend.addressee_id,
      follower: {} as User,
      following: {
        id: friend.addressee.id,
        name: friend.addressee.name,
        username: friend.addressee.username,
        email: friend.addressee.email,
        photoURL: friend.addressee.avatar || '',
        avatar: friend.addressee.avatar || '',
        bio: friend.addressee.bio || undefined,
        location: friend.addressee.location || undefined,
        website: friend.addressee.website || undefined,
        birthday: friend.addressee.birthday ? new Date(friend.addressee.birthday) : undefined,
        gender: friend.addressee.gender || undefined,
        pronouns: friend.addressee.pronouns || undefined,
        coverImage: friend.addressee.cover_image || undefined,
        isPrivate: friend.addressee.is_private || false,
        followerCount: friend.addressee.follower_count || 0,
        followingCount: friend.addressee.following_count || 0,
        profileViews: friend.addressee.profile_views || 0,
        createdAt: new Date(friend.addressee.created_at)
      },
      createdAt: new Date(friend.created_at)
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
          bio: savedPost.post.user.bio || undefined,
          location: savedPost.post.user.location || undefined,
          website: savedPost.post.user.website || undefined,
          birthday: savedPost.post.user.birthday ? new Date(savedPost.post.user.birthday) : undefined,
          gender: savedPost.post.user.gender || undefined,
          pronouns: savedPost.post.user.pronouns || undefined,
          coverImage: savedPost.post.user.cover_image || undefined,
          isPrivate: savedPost.post.user.is_private || false,
          followerCount: savedPost.post.user.follower_count || 0,
          followingCount: savedPost.post.user.following_count || 0,
          profileViews: savedPost.post.user.profile_views || 0,
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
            bio: comment.user.bio || undefined,
            location: comment.user.location || undefined,
            website: comment.user.website || undefined,
            birthday: comment.user.birthday ? new Date(comment.user.birthday) : undefined,
            gender: comment.user.gender || undefined,
            pronouns: comment.user.pronouns || undefined,
            coverImage: comment.user.cover_image || undefined,
            isPrivate: comment.user.is_private || false,
            followerCount: comment.user.follower_count || 0,
            followingCount: comment.user.following_count || 0,
            profileViews: comment.user.profile_views || 0,
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
