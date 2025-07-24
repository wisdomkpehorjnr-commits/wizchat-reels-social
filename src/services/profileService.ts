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

    return data?.map(friend => {
      const requester = friend.requester as any;
      return {
        id: friend.id,
        followerId: friend.requester_id,
        followingId: friend.addressee_id,
        follower: {
          id: requester.id,
          name: requester.name,
          username: requester.username,
          email: requester.email,
          photoURL: requester.avatar || '',
          avatar: requester.avatar || '',
          bio: requester.bio || undefined,
          location: requester.location || undefined,
          website: requester.website || undefined,
          birthday: requester.birthday ? new Date(requester.birthday) : undefined,
          gender: requester.gender || undefined,
          pronouns: requester.pronouns || undefined,
          coverImage: requester.cover_image || undefined,
          isPrivate: requester.is_private || false,
          followerCount: requester.follower_count || 0,
          followingCount: requester.following_count || 0,
          profileViews: requester.profile_views || 0,
          createdAt: new Date(requester.created_at)
        },
        following: {} as User,
        createdAt: new Date(friend.created_at)
      };
    }) || [];
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

    return data?.map(friend => {
      const addressee = friend.addressee as any;
      return {
        id: friend.id,
        followerId: friend.requester_id,
        followingId: friend.addressee_id,
        follower: {} as User,
        following: {
          id: addressee.id,
          name: addressee.name,
          username: addressee.username,
          email: addressee.email,
          photoURL: addressee.avatar || '',
          avatar: addressee.avatar || '',
          bio: addressee.bio || undefined,
          location: addressee.location || undefined,
          website: addressee.website || undefined,
          birthday: addressee.birthday ? new Date(addressee.birthday) : undefined,
          gender: addressee.gender || undefined,
          pronouns: addressee.pronouns || undefined,
          coverImage: addressee.cover_image || undefined,
          isPrivate: addressee.is_private || false,
          followerCount: addressee.follower_count || 0,
          followingCount: addressee.following_count || 0,
          profileViews: addressee.profile_views || 0,
          createdAt: new Date(addressee.created_at)
        },
        createdAt: new Date(friend.created_at)
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
