
import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, X, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Chat, Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import VoiceRecorder from './VoiceRecorder';
import { useToast } from '@/hooks/use-toast';

interface GroupChatPopupProps {
  groupId: string;
  onClose: () => void;
}

const GroupChatPopup = ({ groupId, onClose }: GroupChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGroupChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGroupChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Find the group chat by looking for chats with matching group participants
      const chats = await dataService.getChats();
      const groupChat = chats.find(c => c.isGroup && c.id === groupId);
      
      if (groupChat) {
        setChat(groupChat);
        const chatMessages = await dataService.getMessages(groupChat.id);
        setMessages(chatMessages);
      } else {
        throw new Error('Group chat not found');
      }
    } catch (error) {
      console.error('Error loading group chat:', error);
      toast({
        title: "Error",
        description: "Failed to load group chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || !user) return;

    try {
      const message = await dataService.sendMessage(chat.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!chat) return;
    
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      const voiceMessage = await dataService.createVoiceMessage(chat.id, audioUrl, duration);
      setMessages(prev => [...prev, voiceMessage]);
      
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
    if (!file || !chat) return;

    try {
      const mediaUrl = await MediaService.uploadChatMedia(file);
      const mediaType = MediaService.getMediaType(file);
      
      if (mediaType === 'image' || mediaType === 'video') {
        const mediaMessage = await dataService.createMediaMessage(chat.id, mediaUrl, mediaType);
        setMessages(prev => [...prev, mediaMessage]);
        
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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background border-2 green-border rounded-lg p-6 w-96 h-96">
          <div className="flex items-center justify-center h-full">
            <p className="text-foreground">Loading group chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-background border-2 green-border rounded-lg p-6 w-96">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Group Chat Not Found</h3>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border-2 green-border rounded-lg w-[500px] h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{chat.name || 'Group Chat'}</h3>
              <p className="text-sm text-muted-foreground">
                {chat.participants.length} members
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Members */}
        <div className="p-3 border-b border-border">
          <div className="flex flex-wrap gap-1">
            {chat.participants.slice(0, 5).map((participant) => (
              <Badge key={participant.id} variant="secondary" className="text-xs">
                {participant.name}
              </Badge>
            ))}
            {chat.participants.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{chat.participants.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.userId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!isOwn && (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={message.user.avatar} />
                        <AvatarFallback className="text-xs">
                          {message.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-medium mb-1 text-primary">
                          {message.user.name}
                        </p>
                      )}
                      
                      {message.type === 'text' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {message.type === 'voice' && (
                        <div className="flex items-center space-x-2">
                          <audio controls className="max-w-32">
                            <source src={message.mediaUrl} type="audio/webm" />
                          </audio>
                          <span className="text-xs">{message.duration}s</span>
                        </div>
                      )}
                      
                      {(message.type === 'image' || message.type === 'video') && (
                        <div className="max-w-40">
                          {message.type === 'image' ? (
                            <img 
                              src={message.mediaUrl} 
                              alt="Shared image" 
                              className="rounded w-full h-auto"
                            />
                          ) : (
                            <video 
                              src={message.mediaUrl} 
                              controls 
                              className="rounded w-full h-auto"
                            />
                          )}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
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
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-background text-foreground"
            />
            
            <VoiceRecorder
              onVoiceMessage={handleVoiceMessage}
              onCancel={() => {}}
            />
            
            <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatPopup;
