export interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  isFollowing?: boolean;
  caption: string;
  hashtags: string[];
  audioInfo?: {
    title: string;
    artist: string;
    iconUrl?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  duration?: number;
}

export interface Comment {
  id: string;
  reelId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}

export interface ReelFeedState {
  reels: Reel[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
  likedReelIds: Set<string>;
  savedReelIds: Set<string>;
  followedUserIds: Set<string>;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  error?: string;
}

export interface GestureState {
  isScrolling: boolean;
  scrollVelocity: number;
  offset: number;
}

export interface CommentSheetState {
  isOpen: boolean;
  reelId?: string;
  comments: Comment[];
  isLoadingComments: boolean;
  hasMoreComments: boolean;
}
