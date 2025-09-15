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
        // Get unread message counts for chat badge
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('chat_id, seen')
          .eq('seen', false)
          .neq('user_id', user.id);

        // Count unique chats with unread messages
        const uniqueChats = new Set(unreadMessages?.map(msg => msg.chat_id) || []);
        const chatCount = uniqueChats.size;

        // Get pending friend requests count
        const { data: friendRequests } = await supabase
          .from('friends')
          .select('id')
          .eq('addressee_id', user.id)
          .eq('status', 'pending');

        const friendsCount = friendRequests?.length || 0;

        // Get notifications count
        const { data: notifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);

        const homeCount = notifications?.length || 0;

        setBadges({
          home: homeCount,
          reels: 0,
          chat: chatCount,
          friends: friendsCount,
          topics: 0
        });
      } catch (error) {
        console.error('Error loading badge counts:', error);
      }
    };

    loadBadges();

    // Set up real-time listeners for badge updates
    const messagesChannel = supabase
      .channel('badge_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // If message is not from current user, increment chat badge
          if (payload.new.user_id !== user.id) {
            setBadges(prev => ({ ...prev, chat: prev.chat + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          // If message was marked as seen, recalculate badges
          if (payload.new.seen && !payload.old.seen) {
            loadBadges();
          }
        }
      )
      .subscribe();

    const friendsChannel = supabase
      .channel('badge_friends')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friends' },
        (payload) => {
          if (payload.new.addressee_id === user.id) {
            setBadges(prev => ({ ...prev, friends: prev.friends + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friends' },
        (payload) => {
          if (payload.new.addressee_id === user.id) {
            loadBadges(); // Recalculate when friend request status changes
          }
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('badge_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setBadges(prev => ({ ...prev, home: prev.home + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new.user_id === user.id && payload.new.is_read && !payload.old.is_read) {
            setBadges(prev => ({ ...prev, home: Math.max(0, prev.home - 1) }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  const clearBadge = async (tab: string) => {
    setBadges(prev => ({
      ...prev,
      [tab]: 0
    }));

    // Mark messages as seen when chat tab is opened
    if (tab === 'chat' && user) {
      try {
        const { data: userChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        if (userChats) {
          const chatIds = userChats.map(chat => chat.chat_id);
          await supabase
            .from('messages')
            .update({ seen: true })
            .in('chat_id', chatIds)
            .neq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    }
  };

  return { badges, clearBadge };
};