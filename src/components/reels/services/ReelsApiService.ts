import { Reel, Comment } from '../types';

/**
 * Mock API service for reels feed
 * In production, replace with actual backend API calls
 */

export class ReelsApiService {
  private baseUrl = import.meta.env.VITE_API_URL || '/api';
  private pageSize = 10;
  private cache: Map<string, Reel> = new Map();
  private commentCache: Map<string, Comment[]> = new Map();

  /**
   * Fetch reels paginated
   */
  async fetchReels(page: number = 0): Promise<Reel[]> {
    try {
      // Mock implementation - replace with actual API call
      const response = await fetch(`${this.baseUrl}/reels?page=${page}&limit=${this.pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch reels');

      const data = await response.json();
      return data.reels || [];
    } catch (error) {
      console.error('Failed to fetch reels:', error);
      return this.generateMockReels(page);
    }
  }

  /**
   * Fetch comments for a reel
   */
  async fetchComments(reelId: string, page: number = 0): Promise<Comment[]> {
    try {
      // Check cache first
      if (this.commentCache.has(reelId)) {
        return this.commentCache.get(reelId)!;
      }

      const response = await fetch(`${this.baseUrl}/reels/${reelId}/comments?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      const comments = data.comments || [];

      // Cache comments
      this.commentCache.set(reelId, comments);

      return comments;
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return this.generateMockComments(reelId);
    }
  }

  /**
   * Like a reel
   */
  async likeReel(reelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/reels/${reelId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to like reel:', error);
      return false;
    }
  }

  /**
   * Unlike a reel
   */
  async unlikeReel(reelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/reels/${reelId}/unlike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to unlike reel:', error);
      return false;
    }
  }

  /**
   * Save a reel
   */
  async saveReel(reelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/reels/${reelId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to save reel:', error);
      return false;
    }
  }

  /**
   * Unsave a reel
   */
  async unsaveReel(reelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/reels/${reelId}/unsave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to unsave reel:', error);
      return false;
    }
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to follow user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/unfollow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      return false;
    }
  }

  /**
   * Post a comment
   */
  async postComment(reelId: string, text: string): Promise<Comment | null> {
    try {
      const response = await fetch(`${this.baseUrl}/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const data = await response.json();

      // Update cache
      const existing = this.commentCache.get(reelId) || [];
      this.commentCache.set(reelId, [data.comment, ...existing]);

      return data.comment || null;
    } catch (error) {
      console.error('Failed to post comment:', error);
      return null;
    }
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to like comment:', error);
      return false;
    }
  }

  /**
   * Download a video
   */
  async downloadVideo(reel: Reel): Promise<void> {
    try {
      const response = await fetch(reel.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reel.username}-${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download video:', error);
    }
  }

  /**
   * Share reel (opens share sheet)
   */
  async shareReel(reel: Reel): Promise<void> {
    const text = `Check out this reel by @${reel.username}: ${reel.caption}`;
    const url = `${window.location.origin}/reels/${reel.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this reel',
          text,
          url,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const fullText = `${text}\n${url}`;
      navigator.clipboard.writeText(fullText).catch(console.error);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.commentCache.clear();
  }

  /**
   * Generate mock reels for demo (remove in production)
   */
  private generateMockReels(page: number): Reel[] {
    const mockReels: Reel[] = [];
    const baseIndex = page * this.pageSize;

    for (let i = 0; i < this.pageSize; i++) {
      const id = baseIndex + i;
      mockReels.push({
        id: `reel-${id}`,
        videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4`,
        thumbnailUrl: `https://peach.blender.org/wp-content/uploads/2019/03/01_web_large.jpg`,
        userId: `user-${id % 5}`,
        username: `creator_${id % 5}`,
        userAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${id}`,
        isFollowing: Math.random() > 0.7,
        caption: `This is an amazing reel! 🎉 #viral #trending #awesome #foryou #reels`,
        hashtags: ['viral', 'trending', 'awesome', 'foryou', 'reels'],
        audioInfo: {
          title: 'Perfect Sound',
          artist: 'Music Creator',
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3050/3050159.png',
        },
        likesCount: Math.floor(Math.random() * 100000),
        commentsCount: Math.floor(Math.random() * 10000),
        sharesCount: Math.floor(Math.random() * 5000),
        isLiked: Math.random() > 0.8,
        isSaved: Math.random() > 0.9,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 45,
      });
    }

    return mockReels;
  }

  /**
   * Generate mock comments (remove in production)
   */
  private generateMockComments(reelId: string): Comment[] {
    const comments: Comment[] = [];

    for (let i = 0; i < 5; i++) {
      comments.push({
        id: `comment-${reelId}-${i}`,
        reelId,
        userId: `user-${i}`,
        username: `user_${i}`,
        userAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
        text: `This is an awesome comment! Love it! ${i % 2 === 0 ? '❤️' : '😍'}`,
        likesCount: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.8,
        createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      });
    }

    return comments;
  }
}

export const reelsApiService = new ReelsApiService();
