import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineStatus = (userId: string) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user || !userId || userId === user.id) {
      setIsOnline(false);
      return;
    }

    // Create a presence channel for this user. The channel name must be unique
    // per hook instance: supabase.channel() returns the existing channel for a
    // duplicate topic, and adding callbacks after it subscribed throws.
    const channel = supabase.channel(`user_${userId}_${Math.random().toString(36).slice(2)}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .on('presence', { event: 'join' }, () => {
        setIsOnline(true);
      })
      .on('presence', { event: 'leave' }, () => {
        setIsOnline(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user]);

  return isOnline;
};
