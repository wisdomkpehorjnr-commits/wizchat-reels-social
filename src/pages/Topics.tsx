import React, { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Flame, WifiOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ListSkeleton } from "@/components/SkeletonLoaders";

const TOPICS_CACHE_KEY = 'wizchat_topics_cache';
const REMOVED_ROOM_IDS = new Set(['69af114b-3419-45ac-9bc3-0d40c2f7b080','cb2fe813-3372-4be0-b2d7-432d69d7bd5b']);
const TOPICS_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const normalizeTopicRoomName = (name: string) => {
  const n = (name || '').trim().toLowerCase();
  if (n === 'reel review zone') return 'Trending News';
  return name;
};

interface TopicRoomType {
  id: string;
  name: string;
  description: string;
  participant_count?: number;
  isJoined?: boolean;
}

// =============================================
// PERSISTENT MODULE-LEVEL STORE (survives all remounts)
// =============================================
interface TopicsStore {
  rooms: TopicRoomType[];
  lastFetchTime: number;
  isInitialized: boolean;
}

const topicsStore: TopicsStore = {
  rooms: [],
  lastFetchTime: 0,
  isInitialized: false,
};

// SYNCHRONOUS initialization from localStorage on module load
(() => {
  if (topicsStore.isInitialized) return;
  
  try {
    const cached = localStorage.getItem(TOPICS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data && Array.isArray(parsed.data)) {
        topicsStore.rooms = parsed.data.filter((r: TopicRoomType) => !REMOVED_ROOM_IDS.has(r.id)).map((r: TopicRoomType) => ({
          ...r,
          name: normalizeTopicRoomName(r.name)
        }));
        topicsStore.lastFetchTime = parsed.timestamp || 0;
        console.debug('[Topics] INSTANT hydration from localStorage:', topicsStore.rooms.length, 'rooms');
      }
    }
  } catch (e) {
    console.debug('[Topics] localStorage hydration failed:', e);
  }
  topicsStore.isInitialized = true;
})();

const saveTopicsToCache = (rooms: TopicRoomType[]) => {
  try {
    localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify({
      data: rooms,
      timestamp: Date.now()
    }));
    topicsStore.rooms = rooms;
    topicsStore.lastFetchTime = Date.now();
  } catch (e) {
    console.debug('[Topics] Failed to cache topics:', e);
  }
};

const Topics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // INSTANT display from module store
  const hasCachedData = topicsStore.rooms.length > 0;

  const [rooms, setRooms] = useState<TopicRoomType[]>(topicsStore.rooms);
  const [loading, setLoading] = useState(!hasCachedData);
  const [error, setError] = useState<Error | null>(null);
  const [dataLoaded, setDataLoaded] = useState(hasCachedData);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const hasLoadedRef = useRef(false);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Silent refresh when coming back online
      loadRooms(true);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      const now = Date.now();
      const timeSinceLastFetch = now - topicsStore.lastFetchTime;
      const isCacheStale = timeSinceLastFetch > TOPICS_MIN_REFRESH_INTERVAL_MS;
      
      if (hasCachedData && !isCacheStale) {
        console.debug('[Topics] Cache fresh, skipping network fetch');
        setLoading(false);
        return;
      }
      
      // Background refresh if we have cached data
      loadRooms(hasCachedData);
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
                .maybeSingle();
              isJoined = !!participant;
            }

            return {
              ...room,
              participant_count: count || 0,
              isJoined
            };
          })
        );
        const normalizedRooms = roomsWithCounts.map((r: TopicRoomType) => ({
          ...r,
          name: normalizeTopicRoomName(r.name),
        }));
        setRooms(normalizedRooms);
        saveTopicsToCache(normalizedRooms); // Persist for instant hydration
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
          onConflict: 'room_id,user_id', ignoreDuplicates: true
        });

      if (error) throw error;

      // Update local state
      setRooms(prev => {
        const updated = prev.map(room => 
        room.id === roomId 
          ? { 
              ...room, 
              isJoined: true, 
              participant_count: (room.participant_count || 0) + (room.isJoined ? 0 : 1)
            }
          : room
        );
        saveTopicsToCache(updated);
        return updated;
      });

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
      <main className="relative isolate min-h-full overflow-hidden px-4 py-8 sm:py-12">
        {/* Soft, theme-aware ambient color keeps the glass surfaces feeling light. */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:h-96 sm:w-96" />
        <div aria-hidden="true" className="pointer-events-none absolute right-[-5rem] top-72 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="mx-auto max-w-5xl space-y-8">
          <header className="animate-in fade-in slide-in-from-bottom-3 duration-500 rounded-[2rem] bg-card/55 p-6 shadow-xl shadow-primary/[0.04] backdrop-blur-2xl sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>Find your people</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">Topic Rooms</h1>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Your next great conversation starts here. Join a room and connect over what you love.
                </p>
              </div>
              {isOffline && (
                <div role="status" className="inline-flex w-fit items-center gap-2 rounded-full bg-card/70 px-4 py-2.5 text-sm text-muted-foreground shadow-sm backdrop-blur-xl">
                  <WifiOff className="h-4 w-4" aria-hidden="true" />
                  <span>Offline · showing saved topics</span>
                </div>
              )}
            </div>
          </header>

          <section aria-labelledby="hot-topics-title" className="animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="mb-5 flex items-center gap-3 px-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="hot-topics-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Hot Topic Rooms</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Explore conversations happening now</p>
              </div>
            </div>

            {loading && !isOffline ? (
              <div className="rounded-[2rem] bg-card/45 p-4 shadow-lg shadow-primary/[0.03] backdrop-blur-xl sm:p-6">
                <ListSkeleton itemType="topic" count={4} />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center rounded-[2rem] bg-card/55 px-6 py-14 text-center shadow-lg shadow-primary/[0.03] backdrop-blur-2xl">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/60 text-muted-foreground">
                  {isOffline ? <WifiOff className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
                </div>
                <p className="font-medium text-foreground">{isOffline ? 'Your saved topics will appear here' : 'No topic rooms yet'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isOffline ? 'Connect to discover new rooms.' : 'Check back soon for conversations to join.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {rooms.filter((room) => !REMOVED_ROOM_IDS.has(room.id)).map((room, index) => (
                  <article
                    key={room.id}
                    className="group animate-in fade-in slide-in-from-bottom-2 rounded-[1.75rem] bg-card/55 p-4 shadow-lg shadow-primary/[0.035] backdrop-blur-2xl transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-1 hover:bg-card/75 hover:shadow-xl hover:shadow-primary/[0.08] motion-reduce:animate-none motion-reduce:transition-none sm:p-5"
                    style={{ animationDelay: `${Math.min(index * 65, 390)}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex min-h-[92px] items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105 group-hover:bg-primary/15">
                        <MessageCircle className="h-5 w-5" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                          {normalizeTopicRoomName(room.name)}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {room.description || 'Join the discussion'}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{room.participant_count || 0} {room.participant_count === 1 ? 'member' : 'members'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      {room.isJoined ? (
                        <Button
                          className="h-10 rounded-full bg-primary/10 px-5 font-semibold text-primary shadow-none transition-all duration-200 hover:scale-[1.03] hover:bg-primary/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                          onClick={(e) => handleOpenRoom(room.id, e)}
                        >
                          Open room <span aria-hidden="true" className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                        </Button>
                      ) : (
                        <Button
                          className="h-10 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/15 transition-all duration-200 hover:scale-[1.03] hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                          onClick={(e) => handleJoinRoom(room.id, e)}
                          disabled={joiningRoomId === room.id}
                        >
                          {joiningRoomId === room.id ? 'Joining...' : 'Join room'}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
};

export default Topics;
