
import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, Users, Download, ArrowLeft, MoreVertical, Search, BellOff, Timer, Image as ImageIcon, Trash2, Ban, Flag, Reply, Save, Forward, Pin, Check } from 'lucide-react';
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
import ThemeConfirmationDialog from './ui/theme-confirmation-dialog';
import ConfirmationDialog from './ui/confirmation-dialog';

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
  const [showDisappearingDialog, setShowDisappearingDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [messageActions, setMessageActions] = useState<{ reply: boolean; save: boolean; delete: boolean; forward: boolean; pin: boolean }>({
    reply: false, save: false, delete: false, forward: false, pin: false
  });
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<Message[]>([]);
  const chatAreaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (chatId) {
      loadPinnedMessages();
      loadDisappearingMessagesSetting();
    }
  }, [chatId]);

  // Load disappearing messages setting from chat (stored in localStorage for now)
  const loadDisappearingMessagesSetting = async () => {
    if (!chatId) return;
    try {
      // Try to load from database first (if column exists)
      const { data } = await supabase
        .from('chats')
        .select('disappearing_messages')
        .eq('id', chatId)
        .single();
      if (data?.disappearing_messages) {
        setDisappearingMessages(true);
        localStorage.setItem(`disappearing_${chatId}`, 'true');
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(`disappearing_${chatId}`);
        if (stored === 'true') {
          setDisappearingMessages(true);
        }
      }
    } catch (error) {
      // Column might not exist, use localStorage
      const stored = localStorage.getItem(`disappearing_${chatId}`);
      if (stored === 'true') {
        setDisappearingMessages(true);
      }
    }
  };

  // Load pinned messages
  const loadPinnedMessages = async () => {
    if (!chatId) return;
    try {
      const { data } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          message:messages(*)
        `)
        .eq('chat_id', chatId)
        .order('pinned_at', { ascending: false });
      
      if (data) {
        const pinned = await Promise.all(
          data.map(async (pm: any) => {
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
              .eq('id', pm.message_id)
              .single();
            
            if (messageData) {
              return {
                id: messageData.id,
                chatId: messageData.chat_id,
                userId: messageData.user_id,
                user: messageData.user as User,
                content: messageData.content,
                type: messageData.type as 'text' | 'voice' | 'image' | 'video',
                mediaUrl: messageData.media_url,
                duration: messageData.duration,
                seen: messageData.seen,
                timestamp: new Date(messageData.created_at),
                isPinned: true
              } as Message;
            }
            return null;
          })
        );
        setPinnedMessages(pinned.filter((m): m is Message => m !== null));
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  };

  // Auto-delete messages after 24 hours if disappearing messages is enabled
  // Wait 1 day before deleting, don't delete immediately when turned off
  useEffect(() => {
    if (!disappearingMessages || !chatId) return;

    const checkAndDeleteOldMessages = async () => {
      try {
        // Only delete messages that are exactly 24 hours old or older
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: oldMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .lt('created_at', twentyFourHoursAgo);

        if (oldMessages && oldMessages.length > 0) {
          // Delete permanently from database
          for (const msg of oldMessages) {
            await supabase.from('messages').delete().eq('id', msg.id);
          }
          // Remove from local state
          setMessages(prev => prev.filter(m => 
            m.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
          ));
        }
      } catch (error) {
        console.error('Error deleting old messages:', error);
      }
    };

    // Check every hour for messages that have reached 24 hours
    const interval = setInterval(checkAndDeleteOldMessages, 60 * 60 * 1000);
    checkAndDeleteOldMessages(); // Initial check

    return () => clearInterval(interval);
  }, [disappearingMessages, chatId]);

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
              ),
              reply_to:messages!messages_reply_to_id_fkey (
                id,
                content,
                type,
                user_id,
                user:profiles!messages_user_id_fkey (
                  id,
                  name,
                  username,
                  avatar
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            const replyTo = messageData.reply_to ? {
              id: messageData.reply_to.id,
              chatId: chatId,
              userId: messageData.reply_to.user_id,
              user: messageData.reply_to.user as User,
              content: messageData.reply_to.content,
              type: messageData.reply_to.type as 'text' | 'voice' | 'image' | 'video',
              timestamp: new Date(),
              seen: false
            } : undefined;

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
              timestamp: new Date(messageData.created_at),
              replyToId: messageData.reply_to_id,
              replyTo: replyTo
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
        // Insert message with reply_to_id
        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            user_id: user.id,
            content: messageContent,
            type: 'text',
            reply_to_id: replyToId
          })
          .select(`
            *,
            user:profiles!messages_user_id_fkey (
              id,
              name,
              username,
              avatar
            )
          `)
          .single();
        
        if (error) throw error;
        
        // Add to messages with reply reference
        const newMsg: Message = {
          id: data.id,
          chatId: data.chat_id,
          userId: data.user_id,
          user: data.user as User,
          content: data.content,
          type: data.type as 'text',
          mediaUrl: data.media_url,
          duration: data.duration,
          seen: data.seen,
          timestamp: new Date(data.created_at),
          replyToId: data.reply_to_id,
          replyTo: replyingTo || undefined
        };
        setMessages(prev => [...prev, newMsg]);
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
                    // Delete permanently from database
                    for (const msgId of selectedMessages) {
                      await supabase.from('messages').delete().eq('id', msgId);
                    }
                    setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
                    setSelectedMessages(new Set());
                    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                    toast({ title: "Messages deleted permanently" });
                  } catch (error) {
                    console.error('Error deleting messages:', error);
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
                  // Get selected messages
                  const selectedMsgs = messages.filter(m => selectedMessages.has(m.id));
                  setMessagesToForward(selectedMsgs);
                  setShowForwardDialog(true);
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
                onClick={() => {
                  setMessageToDelete(replyingTo.id);
                  setShowDeleteConfirm(true);
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
                  setMessagesToForward([replyingTo]);
                  setShowForwardDialog(true);
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
                    if (!chatId || !user?.id) return;
                    // Check if already pinned
                    const { data: existing } = await supabase
                      .from('pinned_messages')
                      .select('id')
                      .eq('chat_id', chatId)
                      .eq('message_id', replyingTo.id)
                      .maybeSingle();
                    
                    if (existing) {
                      // Unpin
                      await supabase
                        .from('pinned_messages')
                        .delete()
                        .eq('id', existing.id);
                      setPinnedMessages(prev => prev.filter(m => m.id !== replyingTo.id));
                      toast({ title: "Message unpinned" });
                    } else {
                      // Pin message
                      await supabase.from('pinned_messages').insert({ 
                        message_id: replyingTo.id, 
                        chat_id: chatId, 
                        pinned_by: user.id 
                      });
                      setPinnedMessages(prev => [...prev, { ...replyingTo, isPinned: true }]);
                      toast({ title: "Message pinned" });
                    }
                    setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                    setReplyingTo(null);
                    loadPinnedMessages();
                  } catch (error) {
                    console.error('Error pinning message:', error);
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
            <Avatar className="relative">
              <AvatarImage src={chatUser.avatar} />
              <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
              {disappearingMessages && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-background">
                  <Timer className="w-2.5 h-2.5 text-white" />
                </div>
              )}
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
                    onClick={() => { setShowDisappearingDialog(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground"
                  >
                    <Timer className="w-4 h-4 text-foreground" />
                    <span className="flex-1 text-left">Disappearing messages</span>
                    <span className="text-sm text-muted-foreground">{disappearingMessages ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                      setMessageToDelete('clear-chat'); // Special marker for clear chat
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
                    onClick={() => { setShowReportDialog(true); setShowMenu(false); }}
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

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">Pinned Messages</span>
          </div>
          <div className="space-y-2">
            {pinnedMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => {
                  // Scroll to message
                  const messageElement = document.getElementById(`message-${message.id}`);
                  if (messageElement) {
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    messageElement.classList.add('ring-2', 'ring-green-500');
                    setTimeout(() => {
                      messageElement.classList.remove('ring-2', 'ring-green-500');
                    }, 2000);
                  }
                }}
                className="p-2 rounded-lg hover:bg-accent cursor-pointer border border-green-500/30 bg-background"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={message.user.avatar} />
                    <AvatarFallback className="text-xs">{message.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{message.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{message.content || 'Media'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea 
        ref={chatAreaRef}
        className="flex-1 p-4"
        onClick={(e) => {
          // Close all popups when clicking on empty space
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('space-y-4')) {
            setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
            setReplyingTo(null);
            setSelectedMessages(new Set());
          }
        }}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} id={`message-${message.id}`}>
              <MessageItem
                message={message}
                onEdit={handleEditMessage}
                onDelete={(msgId) => {
                  setMessageToDelete(msgId);
                  setShowDeleteConfirm(true);
                }}
                onLongPress={(msg) => {
                  // Enter selection mode - don't set reply, just select
                  const newSelected = new Set(selectedMessages);
                  newSelected.add(msg.id);
                  setSelectedMessages(newSelected);
                  setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
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
                onReaction={async (msgId, emoji) => {
                  try {
                    await dataService.addMessageReaction(msgId, emoji);
                    toast({ title: "Reaction added", description: emoji });
                  } catch (error: any) {
                    if (error.message === 'Reaction removed') {
                      toast({ title: "Reaction removed" });
                    } else {
                      toast({ title: "Error", description: "Failed to add reaction", variant: "destructive" });
                    }
                  }
                }}
                isSelected={selectedMessages.has(message.id)}
                selectedCount={selectedMessages.size}
              />
            </div>
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

      {/* Disappearing Messages Dialog */}
      <ThemeConfirmationDialog
        open={showDisappearingDialog}
        onOpenChange={setShowDisappearingDialog}
        title="Disappearing Messages"
        description={disappearingMessages 
          ? "Turn off disappearing messages? Messages will no longer be deleted after 24 hours."
          : "Turn on disappearing messages? Messages will be automatically deleted after 24 hours."
        }
        onConfirm={async () => {
          const newValue = !disappearingMessages;
          setDisappearingMessages(newValue);
          if (chatId) {
            try {
              // Try to update database (if column exists)
              await supabase
                .from('chats')
                .update({ disappearing_messages: newValue })
                .eq('id', chatId);
            } catch (error) {
              // Column might not exist, that's okay
            }
            // Always store in localStorage as backup
            localStorage.setItem(`disappearing_${chatId}`, newValue ? 'true' : 'false');
            toast({ 
              title: newValue ? "Disappearing messages enabled" : "Disappearing messages disabled",
              description: newValue 
                ? "Messages will be deleted after 24 hours" 
                : "Messages will no longer be deleted automatically"
            });
          }
        }}
        confirmText={disappearingMessages ? "Turn Off" : "Turn On"}
        cancelText="Cancel"
      />

      {/* Report/Block Dialog */}
      <ThemeConfirmationDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        title="Report User"
        description="Do you want to block this User?"
        onConfirm={async () => {
          try {
            // Block user logic
            await dataService.blockUser(chatUser.id);
            toast({ 
              title: "User blocked", 
              description: "You won't receive messages from this user",
              variant: "destructive" 
            });
            onClose();
          } catch (error) {
            console.error('Error blocking user:', error);
            toast({ 
              title: "Error", 
              description: "Failed to block user", 
              variant: "destructive" 
            });
          }
        }}
        confirmText="Yes"
        cancelText="No"
        variant="destructive"
      />

      {/* Delete Message / Clear Chat Confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={messageToDelete === 'clear-chat' ? "Clear Chat" : "Delete Message"}
        description={messageToDelete === 'clear-chat' 
          ? "Are you sure you want to clear all messages in this chat? This action cannot be undone."
          : "Are you sure you want to delete this message permanently? This action cannot be undone."}
        onConfirm={async () => {
          if (!messageToDelete) return;
          try {
            if (messageToDelete === 'clear-chat') {
              // Delete all messages permanently from database
              if (chatId) {
                await supabase.from('messages').delete().eq('chat_id', chatId);
                setMessages([]);
                toast({ title: "Chat cleared", description: "All messages have been deleted permanently" });
              }
            } else {
              // Delete single message permanently
              await supabase.from('messages').delete().eq('id', messageToDelete);
              setMessages(prev => prev.filter(m => m.id !== messageToDelete));
              if (replyingTo?.id === messageToDelete) {
                setReplyingTo(null);
                setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
              }
              toast({ title: "Message deleted", description: "Message has been deleted permanently" });
            }
          } catch (error) {
            console.error('Error deleting:', error);
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
          }
          setMessageToDelete(null);
        }}
        confirmText={messageToDelete === 'clear-chat' ? "Clear Chat" : "Delete"}
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Forward Messages Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Forward {messagesToForward.length} {messagesToForward.length === 1 ? 'message' : 'messages'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select recipients to forward to
            </DialogDescription>
          </DialogHeader>
          
          <ForwardRecipientsList
            messages={messagesToForward}
            onForward={async (recipientIds: string[]) => {
              try {
                for (const recipientId of recipientIds) {
                  // Get or create chat with recipient
                  const { data: chatId } = await supabase.rpc('get_or_create_direct_chat', {
                    p_other_user_id: recipientId
                  });
                  
                  if (chatId) {
                    // Forward each message
                    for (const msg of messagesToForward) {
                      await supabase.from('messages').insert({
                        chat_id: chatId,
                        user_id: user?.id,
                        content: msg.content,
                        type: msg.type,
                        media_url: msg.mediaUrl,
                        duration: msg.duration
                      });
                    }
                  }
                }
                
                setShowForwardDialog(false);
                setMessagesToForward([]);
                setSelectedMessages(new Set());
                setMessageActions({ reply: false, save: false, delete: false, forward: false, pin: false });
                toast({ 
                  title: "Messages forwarded", 
                  description: `Forwarded ${messagesToForward.length} ${messagesToForward.length === 1 ? 'message' : 'messages'} to ${recipientIds.length} ${recipientIds.length === 1 ? 'recipient' : 'recipients'}` 
                });
              } catch (error) {
                console.error('Error forwarding messages:', error);
                toast({ 
                  title: "Error", 
                  description: "Failed to forward messages", 
                  variant: "destructive" 
                });
              }
            }}
            onCancel={() => {
              setShowForwardDialog(false);
              setMessagesToForward([]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Forward Recipients List Component
const ForwardRecipientsList = ({ 
  messages, 
  onForward, 
  onCancel 
}: { 
  messages: Message[]; 
  onForward: (recipientIds: string[]) => void;
  onCancel: () => void;
}) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const userFriends = await dataService.getFriends();
        const acceptedFriends = userFriends.filter(f => f.status === 'accepted');
        const friendsData = acceptedFriends.map(friend => 
          friend.requester.id === user?.id ? friend.addressee : friend.requester
        );
        setFriends(friendsData);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadFriends();
    }
  }, [user]);

  const toggleRecipient = (friendId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedRecipients(newSelected);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ScrollArea className="flex-1 pr-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No friends to forward to
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => toggleRecipient(friend.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedRecipients.has(friend.id)
                    ? 'bg-green-500/20 border border-green-500'
                    : 'hover:bg-accent'
                }`}
              >
                <Avatar>
                  <AvatarImage src={friend.avatar} />
                  <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{friend.name}</p>
                  <p className="text-sm text-muted-foreground">@{friend.username}</p>
                </div>
                {selectedRecipients.has(friend.id) && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onForward(Array.from(selectedRecipients))}
          disabled={selectedRecipients.size === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          Send ({selectedRecipients.size})
        </Button>
      </div>
    </div>
  );
};

export default ChatPopup;
