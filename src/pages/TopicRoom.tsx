
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RoomMessage, RoomParticipant, TopicRoom } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const TopicRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<TopicRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    loadRoom();
    loadMessages();
    loadParticipants();

    // Subscribe to real-time updates
    const messagesChannel = supabase
      .channel('room-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    const participantsChannel = supabase
      .channel('room-participants')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      // Use proper join syntax with profiles table
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles!room_messages_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedMessages = data?.map(message => {
        const profile = message.profiles;
        
        if (!profile) {
          console.warn('Profile not found for message:', message.id);
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
      }).filter(Boolean) as RoomMessage[];

      setMessages(mappedMessages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles!room_participants_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          )
        `)
        .eq('room_id', roomId);

      if (error) throw error;

      const mappedParticipants = data?.map(participant => {
        const profile = participant.profiles;
        
        if (!profile) {
          console.warn('Profile not found for participant:', participant.id);
          return null;
        }

        return {
          id: participant.id,
          roomId: participant.room_id,
          userId: participant.user_id,
          user: {
            id: profile.id,
            name: profile.name || 'Unknown User',
            username: profile.username || 'unknown',
            email: profile.email || '',
            photoURL: profile.avatar || '',
            avatar: profile.avatar || '',
            createdAt: new Date(profile.created_at || new Date())
          },
          joinedAt: new Date(participant.joined_at),
          lastSeen: new Date(participant.last_seen)
        };
      }).filter(Boolean) as RoomParticipant[];

      setParticipants(mappedParticipants || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Room not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          {room.description && (
            <p className="text-muted-foreground">{room.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {participants.length} participants
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto mb-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.user.avatar} />
                    <AvatarFallback>
                      {message.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={participant.user.avatar} />
                    <AvatarFallback>
                      {participant.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{participant.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{participant.user.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TopicRoomPage;
