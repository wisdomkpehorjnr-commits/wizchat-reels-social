import React, { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ListSkeleton } from "@/components/SkeletonLoaders";

const TOPICS_CACHE_KEY = 'wizchat_topics_cache';

interface TopicRoomType {
  id: string;
  name: string;
  description: string;
  participant_count?: number;
  isJoined?: boolean;
}

// Synchronous localStorage hydration - INSTANT display
const getInitialCachedTopics = (): TopicRoomType[] => {
  try {
    const cached = localStorage.getItem(TOPICS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        console.debug('[Topics] Hydrated from localStorage instantly');
        return parsed.data;
      }
    }
  } catch (e) {
    console.debug('[Topics] localStorage hydration failed:', e);
  }
  return [];
};

const saveTopicsToCache = (rooms: TopicRoomType[]) => {
  try {
    localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify({
      data: rooms,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.debug('[Topics] Failed to cache topics:', e);
  }
};

const Topics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Synchronous hydration - NO loading if cached
  const initialCachedData = getInitialCachedTopics();
  const hasCachedData = initialCachedData.length > 0;

  const [rooms, setRooms] = useState<TopicRoomType[]>(initialCachedData);
  const [loading, setLoading] = useState(!hasCachedData);
  const [error, setError] = useState<Error | null>(null);
  const [dataLoaded, setDataLoaded] = useState(hasCachedData);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      // If cached, display instantly and do silent background refresh
      if (hasCachedData) {
        loadRooms(true); // silent background refresh
      } else {
        loadRooms(false); // first load, show skeleton
      }
    }
    
    // Subscribe to room_participants changes for real-time updates (only if user logged in)
    if (user?.id) {
      const channel = supabase
        .channel('room_participants_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'room_participants'
        }, () => {
          // Silent reload on participant changes
          loadRooms(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, hasCachedData]);

  const loadRooms = async (silent = false) => {
    try {
      if (!silent && !hasCachedData) {
        setLoading(true);
      }
      setError(null);
      const { data, error } = await supabase.from("topic_rooms").select("*");
      if (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      } else {
        // Fetch participant counts and check if user has joined
        const roomsWithCounts = await Promise.all(
          (data || []).map(async (room) => {
            const { count } = await supabase
              .from('room_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);

            let isJoined = false;
            if (user?.id) {
              const { data: participant } = await supabase
                .from('room_participants')
                .select('id')
                .eq('room_id', room.id)
                .eq('user_id', user.id)
                .single();
              isJoined = !!participant;
            }

            return {
              ...room,
              participant_count: count || 0,
              isJoined
            };
          })
        );
        setRooms(roomsWithCounts);
        saveTopicsToCache(roomsWithCounts); // Persist for instant hydration
      }
      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading rooms:', err);
      if (!silent) {
        const error = err instanceof Error ? err : new Error('Failed to load rooms');
        setError(error);
        toast({
          title: "Error",
          description: "Failed to load topic rooms",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join topic rooms",
        variant: "destructive"
      });
      return;
    }

    setJoiningRoomId(roomId);
    try {
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) throw error;

      // Update local state
      setRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { 
              ...room, 
              isJoined: true, 
              participant_count: (room.participant_count || 0) + 1 
            }
          : room
      ));

      toast({
        title: "Success! 🎉",
        description: "You've successfully joined the topic room!"
      });

      // Navigate to room after a brief delay
      setTimeout(() => {
        navigate(`/topic-room/${roomId}`);
      }, 500);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleOpenRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/topic-room/${roomId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Topic Rooms Header Card */}
          <Card className="border-2 border-primary bg-card shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-4xl font-extrabold text-foreground">
                Topic Rooms
              </CardTitle>
              <p className="text-muted-foreground mt-2 text-lg">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>

          {/* Hot Topic Rooms Section */}
          <Card className="border-2 border-primary bg-card shadow-lg">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                Hot Topic Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {loading ? (
                <div className="py-4">
                  <ListSkeleton itemType="topic" count={4} />
                </div>
              ) : rooms.length === 0 && dataLoaded ? (
                <p className="text-center text-muted-foreground py-8">
                  No topic rooms yet.
                </p>
              ) : (
                rooms.map((room) => (
                  <Card
                    key={room.id}
                    className="border border-primary/50 hover:border-primary cursor-pointer bg-card transition-all shadow-sm"
                    onClick={() => room.isJoined ? navigate(`/topic-room/${room.id}`) : undefined}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Chat Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-primary-foreground" />
                          </div>
                        </div>
                        
                        {/* Topic Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground font-semibold text-base mb-1 truncate">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{room.participant_count || 0}</span>
                            </div>
                            <p className="text-muted-foreground text-sm line-clamp-1 flex-1">
                              {room.description || "Join the discussion"}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Join/Open Button */}
                      <div className="flex-shrink-0">
                        {room.isJoined ? (
                          <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-9"
                            onClick={(e) => handleOpenRoom(room.id, e)}
                          >
                            Open
                          </Button>
                        ) : (
                          <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-9"
                            onClick={(e) => handleJoinRoom(room.id, e)}
                            disabled={joiningRoomId === room.id}
                          >
                            {joiningRoomId === room.id ? 'Joining...' : 'Join'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Topics;
