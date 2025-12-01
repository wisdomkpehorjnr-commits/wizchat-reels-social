import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Message, MessageStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { localMessageService, LocalMessage } from '@/services/localMessageService';
import ChatMessage from './ChatMessage';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ChatPopupProps {
  user: User;
  onClose: () => void;
}

const ChatPopup = ({ user: chatUser, onClose }: ChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNetworkOnline = useNetworkStatus();
  const syncInProgressRef = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isNetworkOnline && chatId && !syncInProgressRef.current) {
      syncMessagesWithServer(chatId);
      processOutbox(chatId);
    }
  }, [isNetworkOnline, chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          if (processedMessageIds.current.has(payload.new.id)) {
            return;
          }
          processedMessageIds.current.add(payload.new.id);

          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              *,
              user:profiles!messages_user_id_fkey (
                id,
                name,
                username,
                avatar,
                email,
                bio,
                follower_count,
                following_count,
                profile_views,
                created_at
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData && messageData.user_id !== user?.id) {
            const newMsg: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: {
                ...messageData.user,
                photoURL: messageData.user.avatar || '',
                createdAt: new Date(messageData.user.created_at),
                followerCount: messageData.user.follower_count || 0,
                followingCount: messageData.user.following_count || 0,
                profileViews: messageData.user.profile_views || 0
              } as User,
              content: messageData.content,
              type: messageData.type as 'text' | 'voice' | 'image' | 'video',
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at),
              status: messageData.seen ? 'read' : 'delivered',
              synced: true
            };
            
            const localMsg: LocalMessage = { ...newMsg, status: newMsg.status || 'delivered', synced: true };
            await localMessageService.saveMessage(localMsg);
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const updated: any = payload.new;
          
          setMessages(prev =>
            prev.map(m =>
              m.id === updated.id
                ? {
                    ...m,
                    content: updated.content ?? m.content,
                    seen: updated.seen ?? m.seen,
                    status: updated.seen ? 'read' : m.status
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: chatId, error: chatError } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: chatUser.id
      });

      if (chatError) {
        console.error('Error getting or creating chat:', chatError);
        throw chatError;
      }
      
      setChatId(chatId);
      
      const localMessages = await localMessageService.getMessages(chatId);
      
      const convertedMessages: Message[] = localMessages.map(msg => ({
        ...msg,
        status: msg.status,
        synced: msg.synced
      }));
      
      setMessages(convertedMessages);
      
      if (isNetworkOnline) {
        await syncMessagesWithServer(chatId);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const syncMessagesWithServer = async (chatId: string) => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    try {
      const serverMessages = await dataService.getMessages(chatId);
      
      const localMessages: LocalMessage[] = serverMessages.map(msg => ({
        ...msg,
        status: msg.seen ? 'read' : 'delivered',
        synced: true
      }));
      
      await localMessageService.saveMessages(localMessages);
      
      setMessages(prev => {
        const serverIds = new Set(serverMessages.map(m => m.id));
        const localOnly = prev.filter(m => !serverIds.has(m.id) && m.status === 'pending');
        const converted = serverMessages.map(msg => ({
          ...msg,
          status: (msg.seen ? 'read' : 'delivered') as MessageStatus
        }));
        return [...converted, ...localOnly].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });

      await processOutbox(chatId);
    } catch (error) {
      console.error('Error syncing messages:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const processOutbox = async (chatId: string) => {
    try {
      const outboxMessages = await localMessageService.getOutboxMessages();
      const chatOutbox = outboxMessages.filter(m => m.chatId === chatId);

      for (const localMsg of chatOutbox) {
        try {
          const serverMessage = await dataService.sendMessage(chatId, localMsg.content);
          
          await localMessageService.saveMessage({
            ...localMsg,
            id: serverMessage.id,
            status: 'sent',
            synced: true
          });
          
          if (localMsg.localId) {
            await localMessageService.removeFromOutbox(localMsg.localId);
          }
          
          setMessages(prev => prev.map(m => 
            m.localId === localMsg.localId 
              ? { ...serverMessage, status: 'sent' as MessageStatus }
              : m
          ));
        } catch (error) {
          console.error('Error sending message from outbox:', error);
        }
      }
    } catch (error) {
      console.error('Error processing outbox:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: Message = {
      id: tempId,
      chatId,
      userId: user.id,
      user,
      content: messageContent,
      type: 'text',
      timestamp: new Date(),
      seen: false,
      status: isNetworkOnline ? 'pending' : 'pending',
      localId: tempId,
      synced: false
    };

    setMessages(prev => [...prev, tempMessage]);
    processedMessageIds.current.add(tempId);

    const localMsg: LocalMessage = { ...tempMessage, status: tempMessage.status || 'pending', synced: false };
    await localMessageService.saveMessage(localMsg);

    if (isNetworkOnline) {
      try {
        const serverMessage = await dataService.sendMessage(chatId, messageContent);
        processedMessageIds.current.add(serverMessage.id);
        
        const updatedMsg: Message = {
          ...serverMessage,
          status: 'sent'
        };
        
        setMessages(prev => 
          prev.map(m => m.localId === tempId ? updatedMsg : m)
        );
        
        const updatedLocalMsg: LocalMessage = { ...updatedMsg, status: 'sent', synced: true };
        await localMessageService.saveMessage(updatedLocalMsg);
        await localMessageService.deleteMessage(tempId, chatId);
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Failed to send",
          description: "Message will be sent when online",
          variant: "destructive"
        });
        
        await localMessageService.addToOutbox(localMsg);
      }
    } else {
      await localMessageService.addToOutbox(localMsg);
    }

    scrollToBottom();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !chatId) return;

    try {
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? {
                ...m,
                reactions: [
                  ...(m.reactions || []),
                  { id: Date.now().toString(), messageId, userId: user.id, emoji, createdAt: new Date(), user }
                ]
              }
            : m
        )
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={chatUser.avatar} />
            <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{chatUser.name}</p>
            <div className="flex items-center gap-1">
              <OnlineStatusIndicator userId={chatUser.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage
                key={message.id || message.localId}
                message={message}
                onReaction={(emoji) => handleReaction(message.id, emoji)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t-2 border-primary/20">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border-2 border-primary/30 focus:border-primary rounded-full"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
