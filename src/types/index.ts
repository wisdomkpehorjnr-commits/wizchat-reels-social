
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  avatar: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'text' | 'image' | 'video';
  isReel?: boolean;
  likes: string[];
  comments: Comment[];
  reactions: Reaction[];
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

export interface Chat {
  id: string;
  participants: User[];
  isGroup: boolean;
  name?: string;
  lastMessage?: Message;
  lastActivity: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  user: User;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice';
  mediaUrl?: string;
  duration?: number; // for voice messages in seconds
  timestamp: Date;
  seen: boolean;
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  videoFile?: File;
  mediaType?: 'text' | 'image' | 'video';
  isReel?: boolean;
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
