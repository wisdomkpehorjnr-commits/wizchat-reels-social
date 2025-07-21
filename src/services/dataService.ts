
import { User, Post, Chat, Message } from '@/types';

// This service will be replaced with real API calls later
export class DataService {
  private static instance: DataService;
  
  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // User methods
  async getCurrentUser(): Promise<User | null> {
    // TODO: Replace with real API call
    return null;
  }

  async getUsers(): Promise<User[]> {
    // TODO: Replace with real API call
    return [];
  }

  // Post methods
  async getPosts(): Promise<Post[]> {
    // TODO: Replace with real API call
    return [];
  }

  async createPost(postData: { content: string; imageFile?: File; videoFile?: File; isReel?: boolean }): Promise<Post> {
    // TODO: Replace with real API call
    throw new Error('Not implemented');
  }

  async likePost(postId: string): Promise<void> {
    // TODO: Replace with real API call
    console.log('Like post:', postId);
  }

  async unlikePost(postId: string): Promise<void> {
    // TODO: Replace with real API call
    console.log('Unlike post:', postId);
  }

  // Chat methods
  async getChats(): Promise<Chat[]> {
    // TODO: Replace with real API call
    return [];
  }

  async getMessages(chatId: string): Promise<Message[]> {
    // TODO: Replace with real API call
    return [];
  }

  async sendMessage(chatId: string, content: string): Promise<Message> {
    // TODO: Replace with real API call
    throw new Error('Not implemented');
  }

  async createChat(participants: string[], isGroup: boolean, name?: string): Promise<Chat> {
    // TODO: Replace with real API call
    throw new Error('Not implemented');
  }
}

export const dataService = DataService.getInstance();
