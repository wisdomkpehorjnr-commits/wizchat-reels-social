import { User, Post, Chat, Message } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    username: '@sarahj',
    email: 'sarah@example.com',
    photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Mike Chen',
    username: '@mikechen',
    email: 'mike@example.com',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    name: 'Emma Davis',
    username: '@emmadavis',
    email: 'emma@example.com',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    createdAt: new Date('2024-01-12'),
  },
];

export const mockCurrentUser = mockUsers[0];

export const mockPosts: Post[] = [
  {
    id: '1',
    userId: '2',
    user: mockUsers[1],
    content: 'Just finished an amazing coding session! Building something cool with React and TypeScript 🚀',
    imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop',
    likes: ['1', '3'],
    comments: [
      {
        id: '1',
        userId: '1',
        user: mockUsers[0],
        postId: '1',
        content: 'Looks awesome! What are you building?',
        createdAt: new Date('2024-01-20T14:30:00'),
      },
    ],
    createdAt: new Date('2024-01-20T12:00:00'),
  },
  {
    id: '2',
    userId: '3',
    user: mockUsers[2],
    content: 'New reel: Quick tutorial on modern CSS animations! ✨',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isReel: true,
    likes: ['1', '2'],
    comments: [],
    createdAt: new Date('2024-01-20T10:30:00'),
  },
  {
    id: '3',
    userId: '1',
    user: mockUsers[0],
    content: 'Beautiful sunset from my morning walk 🌅',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    likes: ['2'],
    comments: [
      {
        id: '2',
        userId: '2',
        user: mockUsers[1],
        postId: '3',
        content: 'Stunning view! 😍',
        createdAt: new Date('2024-01-20T09:15:00'),
      },
    ],
    createdAt: new Date('2024-01-20T09:00:00'),
  },
];

export const mockChats: Chat[] = [
  {
    id: '1',
    participants: [mockUsers[0], mockUsers[1]],
    isGroup: false,
    lastMessage: {
      id: '1',
      chatId: '1',
      userId: '2',
      user: mockUsers[1],
      content: 'Hey! How are you doing?',
      type: 'text',
      timestamp: new Date('2024-01-20T15:30:00'),
      seen: false,
    },
    lastActivity: new Date('2024-01-20T15:30:00'),
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    participants: [mockUsers[0], mockUsers[2]],
    isGroup: false,
    lastMessage: {
      id: '2',
      chatId: '2',
      userId: '1',
      user: mockUsers[0],
      content: 'Thanks for the help yesterday!',
      type: 'text',
      timestamp: new Date('2024-01-20T11:00:00'),
      seen: true,
    },
    lastActivity: new Date('2024-01-20T11:00:00'),
    createdAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    participants: mockUsers,
    isGroup: true,
    name: 'Dev Team',
    lastMessage: {
      id: '3',
      chatId: '3',
      userId: '3',
      user: mockUsers[2],
      content: 'Meeting at 3 PM today!',
      type: 'text',
      timestamp: new Date('2024-01-20T08:00:00'),
      seen: true,
    },
    lastActivity: new Date('2024-01-20T08:00:00'),
    createdAt: new Date('2024-01-10'),
  },
];

export const mockMessages: Message[] = [
  {
    id: '1',
    chatId: '1',
    userId: '2',
    user: mockUsers[1],
    content: 'Hey! How are you doing?',
    type: 'text',
    timestamp: new Date('2024-01-20T15:30:00'),
    seen: false,
  },
  {
    id: '2',
    chatId: '1',
    userId: '1',
    user: mockUsers[0],
    content: 'I\'m good! Just working on a new project',
    type: 'text',
    timestamp: new Date('2024-01-20T15:32:00'),
    seen: true,
  },
  {
    id: '3',
    chatId: '1',
    userId: '2',
    user: mockUsers[1],
    content: 'That sounds exciting! What kind of project?',
    type: 'text',
    timestamp: new Date('2024-01-20T15:33:00'),
    seen: false,
  },
];
