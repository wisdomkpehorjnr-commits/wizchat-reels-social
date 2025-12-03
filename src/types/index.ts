export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  avatar: string;
  bio?: string;
  location?: string;
  website?: string;
  birthday?: Date;
  gender?: string;
  pronouns?: string;
  coverImage?: string;
  isPrivate?: boolean;
  followerCount: number;
  followingCount: number;
  profileViews: number;
  createdAt: Date;
  role?: string; // Add role property for chat participants
  is_verified?: boolean; // Add verification status
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  mediaType?: 'text' | 'image' | 'video';
  isReel?: boolean;
  musicId?: string;
  music?: MusicTrack;
  likes: string[];
  comments: Comment[];
  reactions: Reaction[];
  hashtags: Hashtag[];
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  postId: string;
  content: string;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  userId: string;
  user: User;
  postId: string;
  emoji: string;
  createdAt: Date;
}

export interface CustomEmoji {
  id: string;
  name: string;
  imageUrl: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface Friend {
  id: string;
  requesterId: string;
  addresseeId: string;
  requester: User;
  addressee: User;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  follower: User;
  following: User;
  createdAt: Date;
}

export interface Chat {
  id: string;
  participants: User[];
  allParticipants?: User[]; // Add this for internal matching
  isGroup: boolean;
  name?: string;
  description?: string;
  avatar?: string;
  lastMessage?: Message;
  lastActivity: Date;
  createdAt: Date;
  creatorId?: string;
  inviteCode?: string;
  isPublic?: boolean;
  memberCount?: number;
  unreadCount?: number; // Add unreadCount property
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  user?: User;
  emoji: string;
  createdAt: Date;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  user: User;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'audio' | 'document'; // Frontend types, DB only has 'text' | 'image' | 'video'
  mediaUrl?: string;
  duration?: number;
  timestamp: Date;
  seen: boolean;
  reactions?: MessageReaction[];
  isPinned?: boolean;
  status?: MessageStatus; // Message delivery status
  localId?: string; // Temporary ID for unsent messages
  synced?: boolean; // Whether message has been synced to server
  replyToMessage?: Message; // Message being replied to
  fileName?: string; // For documents
  fileSize?: number; // For documents
}

export interface VoiceCall {
  id: string;
  callerId: string;
  receiverId: string;
  caller: User;
  receiver: User;
  status: 'calling' | 'active' | 'ended' | 'missed';
  startedAt: Date;
  endedAt?: Date;
  duration: number;
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  videoFile?: File;
  mediaType?: 'text' | 'image' | 'video';
  isReel?: boolean;
  musicId?: string;
}

export interface CreateChatData {
  participants: string[];
  isGroup: boolean;
  name?: string;
}

export interface SiteSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  updatedBy?: string;
  updatedAt: Date;
}

export interface Hashtag {
  id: string;
  name: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HashtagFollow {
  id: string;
  userId: string;
  hashtagId: string;
  hashtag: Hashtag;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  inviteCode?: string;
  createdBy: string;
  creator?: User;
  memberCount: number;
  members?: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: string;
  joinedAt: Date;
}

export interface TopicRoom {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  user: User;
  joinedAt: Date;
  lastSeen: Date;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: Date;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  fileUrl: string;
  isRoyaltyFree: boolean;
  createdAt: Date;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  content?: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video';
  viewerCount: number;
  views?: StoryView[];
  expiresAt: Date;
  createdAt: Date;
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  user: User;
  viewedAt: Date;
}

export interface SavedPost {
  id: string;
  userId: string;
  postId: string;
  post: Post;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}
