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
  isReel?: boolean;
  likes: string[];
  comments: Comment[];
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
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  timestamp: Date;
  seen: boolean;
}

export interface CreatePostData {
  content: string;
  imageFile?: File;
  videoFile?: File;
  isReel?: boolean;
}

export interface CreateChatData {
  participants: string[];
  isGroup: boolean;
  name?: string;
}
