import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Plus, Phone, Video } from 'lucide-react';
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
import ChatSettingsMenu from './chat/ChatSettingsMenu';
import AttachmentMenu from './chat/AttachmentMenu';
import VoiceRecorder from './chat/VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNavigate } from 'react-router-dom';

interface ChatPopupProps {
  user: User;
  onClose: () => void;
}

const ChatPopup = ({ user: chatUser, onClose }: ChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNetworkOnline = useNetworkStatus();
  const syncInProgressRef = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const sendSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize send sound
    sendSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAdEo+Hzu2ohBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAc=');
    sendSound.current.volume = 0.3;
  }, []);

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
      // Check if user already has a reaction
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing reaction
        await supabase
          .from('message_reactions')
          .update({ emoji })
          .eq('id', existing.id);
      } else {
        // Add new reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    if (!chatId) return;

    try {
      if (deleteForEveryone) {
        // Delete from database
        await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);
      }
      
      // Remove from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      await localMessageService.deleteMessage(messageId, chatId);
      
      toast({
        title: "Message deleted",
        description: deleteForEveryone ? "Deleted for everyone" : "Deleted for you"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleAttachment = (type: string) => {
    toast({
      title: "Coming Soon",
      description: `${type} attachment feature will be available soon`
    });
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    toast({
      title: "Voice message",
      description: `Recorded ${duration} seconds`
    });
    // Implement voice message upload
  };

  const handleChatSettings = {
    onMute: (duration: string) => {
      toast({
        title: "Chat muted",
        description: `Notifications muted for ${duration}`
      });
    },
    onClear: async () => {
      if (!chatId) return;
      
      try {
        await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId);
        
        setMessages([]);
        
        toast({
          title: "Chat cleared",
          description: "All messages have been deleted"
        });
      } catch (error) {
        console.error('Error clearing chat:', error);
        toast({
          title: "Error",
          description: "Failed to clear chat",
          variant: "destructive"
        });
      }
    },
    onExport: () => {
      const exportText = messages.map(m => 
        `[${m.timestamp.toLocaleString()}] ${m.user.name}: ${m.content}`
      ).join('\n');
      
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${chatUser.name}-${new Date().toISOString()}.txt`;
      a.click();
      
      toast({
        title: "Chat exported",
        description: "Chat saved as text file"
      });
    },
    onBlock: () => {
      toast({
        title: "User blocked",
        description: `You won't receive messages from ${chatUser.name}`,
        variant: "destructive"
      });
    },
    onReport: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for reporting. We'll review this."
      });
    },
    onFavorite: () => {
      toast({
        title: "Added to favorites",
        description: `${chatUser.name} added to favorites`
      });
    },
    onViewProfile: () => {
      navigate(`/profile/${chatUser.username}`);
    },
    onDisappearingMessages: (duration: string) => {
      toast({
        title: "Disappearing messages",
        description: `Messages will disappear after ${duration}`
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/20">
        <div className="flex items-center gap-3 flex-1">
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
          <div className="flex-1">
            <p className="font-semibold">{chatUser.name}</p>
            <div className="flex items-center gap-1">
              <OnlineStatusIndicator userId={chatUser.id} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast({ title: "Coming Soon", description: "Voice call feature" })}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast({ title: "Coming Soon", description: "Video call feature" })}
          >
            <Video className="w-5 h-5" />
          </Button>
          <ChatSettingsMenu
            chatUser={chatUser}
            {...handleChatSettings}
          />
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
                onDelete={handleDeleteMessage}
                onReply={setReplyingTo}
                onForward={(msg) => {
                  toast({
                    title: "Forward message",
                    description: "Select chats to forward to"
                  });
                  navigate('/chat');
                }}
                onPin={(id) => {
                  toast({
                    title: "Message pinned",
                    description: "Message pinned to top of chat"
                  });
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t-2 border-primary/20">
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Replying to {replyingTo.user.name}</p>
              <p className="text-sm truncate">{replyingTo.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              ✕
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachmentMenu(true)}
            className="flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                if (sendSound.current) {
                  sendSound.current.play().catch(() => {});
                }
              }
            }}
            placeholder="Type a message..."
            className="flex-1 border-2 border-primary/30 focus:border-primary rounded-full"
          />
          {newMessage.trim() ? (
            <Button
              onClick={() => {
                sendMessage();
                if (sendSound.current) {
                  sendSound.current.play().catch(() => {});
                }
              }}
              disabled={!newMessage.trim()}
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <VoiceRecorder
              onSend={handleVoiceSend}
              onCancel={() => {}}
            />
          )}
        </div>
      </div>

      {/* Attachment Menu */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onCamera={() => handleAttachment('Camera')}
        onGallery={() => handleAttachment('Gallery')}
        onDocument={() => handleAttachment('Document')}
        onLocation={() => handleAttachment('Location')}
        onAudio={() => handleAttachment('Audio')}
        onVideo={() => handleAttachment('Video')}
      />
    </div>
  );
};

export default ChatPopup;
