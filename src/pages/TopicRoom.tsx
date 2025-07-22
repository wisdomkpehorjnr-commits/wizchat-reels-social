
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TopicRoom as TopicRoomType, RoomMessage, User } from '@/types';
import { Send, ArrowLeft, Users, MessageCircle } from 'lucide-react';

const TopicRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<TopicRoomType | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId) {
      loadRoom();
      loadMessages();
      joinRoom();
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`room-${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        }, () => {
          loadMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('topic_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;

      setRoom({
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        participantCount: data.participant_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      });
    } catch (error) {
      console.error('Error loading room:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
        return;
      }

      const messagesData = data?.map(message => {
        // Handle case where profiles might be null
        const profile = message.profiles;
        if (!profile) {
          return null;
        }

        return {
          id: message.id,
          roomId: message.room_id,
          userId: message.user_id,
          user: {
            id: profile.id,
            name: profile.name || 'Unknown User',
            username: profile.username || 'unknown',
            email: profile.email || '',
            photoURL: profile.avatar || '',
            avatar: profile.avatar || '',
            createdAt: new Date(profile.created_at || new Date())
          },
          content: message.content,
          createdAt: new Date(message.created_at)
        };
      }).filter(Boolean) as RoomMessage[] || [];

      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        setIsParticipant(true);
        return;
      }

      // Join the room
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id
        });

      if (!error) {
        setIsParticipant(true);
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isParticipant) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: newMessage
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading room...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Room not found</p>
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
        {/* Room Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                
                <div>
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                  {room.description && (
                    <p className="text-sm text-muted-foreground">{room.description}</p>
                  )}
                </div>
              </div>
              
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{room.participantCount}</span>
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {message.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{message.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            )}
          </CardContent>

          {/* Message Input */}
          {isParticipant && (
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!isParticipant && (
            <div className="p-4 border-t text-center">
              <p className="text-muted-foreground">Join the room to participate in the conversation</p>
              <Button onClick={joinRoom} className="mt-2">
                Join Room
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default TopicRoom;
