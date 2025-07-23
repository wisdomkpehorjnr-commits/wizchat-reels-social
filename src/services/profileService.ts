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
      bio: (data as any).bio || undefined,
      location: (data as any).location || undefined,
      website: (data as any).website || undefined,
      birthday: (data as any).birthday ? new Date((data as any).birthday) : undefined,
      gender: (data as any).gender || undefined,
      pronouns: (data as any).pronouns || undefined,
      coverImage: (data as any).cover_image || undefined,
      isPrivate: (data as any).is_private || false,
      followerCount: (data as any).follower_count || 0,
      followingCount: (data as any).following_count || 0,
      profileViews: (data as any).profile_views || 0,
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
        bio: (friend.requester as any).bio || undefined,
        location: (friend.requester as any).location || undefined,
        website: (friend.requester as any).website || undefined,
        birthday: (friend.requester as any).birthday ? new Date((friend.requester as any).birthday) : undefined,
        gender: (friend.requester as any).gender || undefined,
        pronouns: (friend.requester as any).pronouns || undefined,
        coverImage: (friend.requester as any).cover_image || undefined,
        isPrivate: (friend.requester as any).is_private || false,
        followerCount: (friend.requester as any).follower_count || 0,
        followingCount: (friend.requester as any).following_count || 0,
        profileViews: (friend.requester as any).profile_views || 0,
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
        bio: (friend.addressee as any).bio || undefined,
        location: (friend.addressee as any).location || undefined,
        website: (friend.addressee as any).website || undefined,
        birthday: (friend.addressee as any).birthday ? new Date((friend.addressee as any).birthday) : undefined,
        gender: (friend.addressee as any).gender || undefined,
        pronouns: (friend.addressee as any).pronouns || undefined,
        coverImage: (friend.addressee as any).cover_image || undefined,
        isPrivate: (friend.addressee as any).is_private || false,
        followerCount: (friend.addressee as any).follower_count || 0,
        followingCount: (friend.addressee as any).following_count || 0,
        profileViews: (friend.addressee as any).profile_views || 0,
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
          bio: (savedPost.post.user as any).bio || undefined,
          location: (savedPost.post.user as any).location || undefined,
          website: (savedPost.post.user as any).website || undefined,
          birthday: (savedPost.post.user as any).birthday ? new Date((savedPost.post.user as any).birthday) : undefined,
          gender: (savedPost.post.user as any).gender || undefined,
          pronouns: (savedPost.post.user as any).pronouns || undefined,
          coverImage: (savedPost.post.user as any).cover_image || undefined,
          isPrivate: (savedPost.post.user as any).is_private || false,
          followerCount: (savedPost.post.user as any).follower_count || 0,
          followingCount: (savedPost.post.user as any).following_count || 0,
          profileViews: (savedPost.post.user as any).profile_views || 0,
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
            bio: (comment.user as any).bio || undefined,
            location: (comment.user as any).location || undefined,
            website: (comment.user as any).website || undefined,
            birthday: (comment.user as any).birthday ? new Date((comment.user as any).birthday) : undefined,
            gender: (comment.user as any).gender || undefined,
            pronouns: (comment.user as any).pronouns || undefined,
            coverImage: (comment.user as any).cover_image || undefined,
            isPrivate: (comment.user as any).is_private || false,
            followerCount: (comment.user as any).follower_count || 0,
            followingCount: (comment.user as any).following_count || 0,
            profileViews: (comment.user as any).profile_views || 0,
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
