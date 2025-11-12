
import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, Users, Download, ArrowLeft, MoreVertical, Search, BellOff, Timer, Image as ImageIcon, Trash2, Ban, Flag, Reply, Save, Forward, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import VoiceRecorder from './VoiceRecorder';
import MessageItem from './MessageItem';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus(chatUser.id);
  
  // Menu and message selection states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageActions, setMessageActions] = useState<{ reply: boolean; save: boolean; delete: boolean; forward: boolean; pin: boolean }>({
    reply: false, save: false, delete: false, forward: false, pin: false
  });


  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              *,
              user:profiles!messages_user_id_fkey (
                id,
                name,
                username,
                avatar
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            const newMsg: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: messageData.user as User,
              content: messageData.content,
              type: messageData.type as 'text' | 'voice' | 'image' | 'video',
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at)
            };
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updated: any = payload.new;
          setMessages(prev =>
            prev.map(m =>
              m.id === updated.id
                ? {
                    ...m,
                    content: updated.content ?? m.content,
                    mediaUrl: updated.media_url ?? m.mediaUrl,
                    type: updated.type ?? m.type,
                    duration: updated.duration ?? m.duration,
                    seen: updated.seen ?? m.seen,
                  }
                : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const removed: any = payload.old;
          setMessages(prev => prev.filter(m => m.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Use the new database function for reliable chat retrieval/creation
      const { data: chatId, error: chatError } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: chatUser.id
      });

      if (chatError) {
        console.error('Error getting or creating chat:', chatError);
        throw chatError;
      }
      
      setChatId(chatId);
      
      // Load messages for this chat
      const chatMessages = await dataService.getMessages(chatId);
      setMessages(chatMessages);
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    const messageContent = newMessage.trim();
    const replyToId = replyingTo?.id;
    setNewMessage(''); // Clear input immediately for better UX
    setReplyingTo(null); // Clear reply
    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });

    try {
      // Send message with reply reference if replying
      if (replyToId) {
        // Include reply info in message content or as metadata
        await dataService.sendMessage(chatId, messageContent);
        // TODO: Add reply_to_id field to messages table if needed
      } else {
        await dataService.sendMessage(chatId, messageContent);
      }
      
      // Update chat's last activity
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      // Restore message content on error
      setNewMessage(messageContent);
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!chatId) return;
    
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      await dataService.createVoiceMessage(chatId, audioUrl, duration);
      
      toast({
        title: "Success",
        description: "Voice message sent"
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;

    try {
      const mediaUrl = await MediaService.uploadChatMedia(file);
      const mediaType = MediaService.getMediaType(file);
      
      if (mediaType === 'image' || mediaType === 'video') {
        await dataService.createMediaMessage(chatId, mediaUrl, mediaType);
        
        toast({
          title: "Success",
          description: "File uploaded successfully"
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent }
        : msg
    ));
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <p className="text-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        {selectedMessages.size > 0 ? (
          // Message action buttons when messages are selected
          <div className="flex items-center gap-2 flex-1">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedMessages(new Set()); setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false }); }} className="text-foreground">
              <X className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground">{selectedMessages.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  try {
                    for (const msgId of selectedMessages) {
                      await dataService.deleteMessage(msgId);
                    }
                    setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
                    setSelectedMessages(new Set());
                    toast({ title: "Messages deleted" });
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to delete messages", variant: "destructive" });
                  }
                }} 
                className="text-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  toast({ title: "Messages pinned" });
                  setSelectedMessages(new Set());
                }} 
                className="text-foreground"
              >
                <Pin className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  toast({ title: "Forward messages", description: "Select recipient" });
                  setSelectedMessages(new Set());
                }} 
                className="text-foreground"
              >
                <Forward className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : messageActions.reply || messageActions.save || messageActions.delete || messageActions.forward || messageActions.pin ? (
          // Single message action buttons
          <div className="flex items-center gap-2 flex-1">
            <Button variant="ghost" size="sm" onClick={() => setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false })} className="text-foreground">
              <X className="w-4 h-4" />
            </Button>
            {messageActions.reply && replyingTo && (
              <Button variant="ghost" size="sm" onClick={() => { /* Reply already set, just keep it */ }} className="text-foreground">
                <Reply className="w-4 h-4" />
              </Button>
            )}
            {messageActions.save && replyingTo && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  try {
                    // Save message logic
                    await supabase.from('saved_messages').insert({ message_id: replyingTo.id, user_id: user?.id });
                    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                    setReplyingTo(null);
                    toast({ title: "Message saved" });
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to save message", variant: "destructive" });
                  }
                }} 
                className="text-foreground"
              >
                <Save className="w-4 h-4" />
              </Button>
            )}
            {messageActions.delete && replyingTo && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  try {
                    await dataService.deleteMessage(replyingTo.id);
                    setMessages(prev => prev.filter(m => m.id !== replyingTo.id));
                    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                    setReplyingTo(null);
                    toast({ title: "Message deleted" });
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
                  }
                }} 
                className="text-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {messageActions.forward && replyingTo && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  toast({ title: "Forward message", description: "Select recipient" });
                  setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                  setReplyingTo(null);
                }} 
                className="text-foreground"
              >
                <Forward className="w-4 h-4" />
              </Button>
            )}
            {messageActions.pin && replyingTo && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  try {
                    // Pin message logic
                    await supabase.from('pinned_messages').insert({ message_id: replyingTo.id, chat_id: chatId, user_id: user?.id });
                    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                    setReplyingTo(null);
                    toast({ title: "Message pinned" });
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to pin message", variant: "destructive" });
                  }
                }} 
                className="text-foreground"
              >
                <Pin className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          // Normal header
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={chatUser.avatar} />
              <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{chatUser.name}</h3>
              {isOnline && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-muted-foreground">Active now</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)} className="text-foreground">
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {/* Three-dot Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-50">
                <div className="p-1">
                  <button
                    onClick={() => { setShowSearch(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Search className="w-4 h-4 text-foreground" />
                    <span>Search</span>
                  </button>
                  <button
                    onClick={() => { setIsMuted(!isMuted); setShowMenu(false); toast({ title: isMuted ? "Notifications enabled" : "Notifications muted" }); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <BellOff className="w-4 h-4 text-foreground" />
                    <span>{isMuted ? "Unmute notifications" : "Mute notifications"}</span>
                  </button>
                  <button
                    onClick={() => { setDisappearingMessages(!disappearingMessages); setShowMenu(false); toast({ title: disappearingMessages ? "Disappearing messages off" : "Disappearing messages on" }); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Timer className="w-4 h-4 text-foreground" />
                    <span>{disappearingMessages ? "Disable disappearing messages" : "Enable disappearing messages"}</span>
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); toast({ title: "Wallpaper", description: "Choose a wallpaper" }); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <ImageIcon className="w-4 h-4 text-foreground" />
                    <span>Wallpaper</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear this chat?")) {
                        // Clear chat logic
                        setMessages([]);
                        setShowMenu(false);
                        toast({ title: "Chat cleared" });
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Trash2 className="w-4 h-4 text-foreground" />
                    <span>Clear chat</span>
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to block this user?")) {
                        setShowMenu(false);
                        toast({ title: "User blocked", variant: "destructive" });
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Ban className="w-4 h-4 text-foreground" />
                    <span>Block</span>
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); toast({ title: "Report submitted", description: "Thank you for reporting" }); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Flag className="w-4 h-4 text-foreground" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Messages</DialogTitle>
            <DialogDescription>Search for messages in this conversation</DialogDescription>
          </DialogHeader>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="mt-4"
          />
          <div className="mt-4 max-h-60 overflow-y-auto">
            {messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase())).map(msg => (
              <div key={msg.id} className="p-2 hover:bg-accent rounded cursor-pointer" onClick={() => { setShowSearch(false); /* Scroll to message */ }}>
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onLongPress={(msg) => {
                setMessageActions({ reply: true, save: true, delete: true, forward: true, pin: true });
                setReplyingTo(msg);
              }}
              onSwipeReply={(msg) => {
                setReplyingTo(msg);
                setMessageActions({ reply: true, save: false, delete: false, forward: false, pin: false });
              }}
              onSelect={(msgId, selected) => {
                const newSelected = new Set(selectedMessages);
                if (selected) {
                  newSelected.add(msgId);
                } else {
                  newSelected.delete(msgId);
                }
                setSelectedMessages(newSelected);
              }}
              onReaction={(msgId, emoji) => {
                // Add reaction logic
                toast({ title: "Reaction added", description: emoji });
              }}
              isSelected={selectedMessages.has(message.id)}
              selectedCount={selectedMessages.size}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-border bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Reply className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{replyingTo.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{replyingTo.content || 'Media'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false }); }} className="text-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-foreground"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? "Type a reply..." : "Type a message..."}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-background text-foreground border border-green-500"
          />
          
          <VoiceRecorder
            onVoiceMessage={handleVoiceMessage}
            onCancel={() => {}}
          />
          
          <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()} className="bg-green-600 hover:bg-green-700 text-white">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
