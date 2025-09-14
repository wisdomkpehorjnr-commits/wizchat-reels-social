import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BadgeCounts {
  home: number;
  reels: number;
  chat: number;
  friends: number;
  topics: number;
}

export const useNotificationBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeCounts>({
    home: 0,
    reels: 0,
    chat: 0,
    friends: 0,
    topics: 0
  });

  useEffect(() => {
    if (!user) return;

    const loadBadges = async () => {
      try {
        // Calculate badge counts with simple counts
        const homeCount = 0; // Notifications count
        const reelsCount = 0; // Reel notifications
        const chatCount = 0; // Unread messages  
        const friendsCount = 0; // Friend requests
        const topicsCount = 0; // Topic notifications

        setBadges({
          home: homeCount,
          reels: reelsCount,
          chat: chatCount,
          friends: friendsCount,
          topics: topicsCount
        });
      } catch (error) {
        console.error('Error loading badge counts:', error);
      }
    };

    loadBadges();
  }, [user]);

  const clearBadge = (tab: string) => {
    setBadges(prev => ({
      ...prev,
      [tab]: 0
    }));
  };

  return { badges, clearBadge };
};