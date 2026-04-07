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
        // Get user's chat IDs first
        const { data: userChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        const chatIds = userChats?.map(c => c.chat_id) || [];

        // Get unread message counts using receipt table
        let chatCount = 0;
        if (chatIds.length > 0) {
          const { data: unreadReceipts, error: receiptsError } = await supabase
            .from('message_receipts')
            .select('id')
            .eq('recipient_id', user.id)
            .in('chat_id', chatIds)
            .is('read_at', null);
          
          if (receiptsError) {
            console.error('Error fetching unread receipts:', receiptsError);
          }
          
          chatCount = unreadReceipts?.length || 0;
        }

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

        console.log('Badge counts:', {
          home: homeCount,
          chat: chatCount,
          friends: friendsCount
        });

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
        async (payload) => {
          // Only count messages from OTHER users that are unread
          if (payload.new.user_id !== user.id && !payload.new.seen) {
            // Verify this message is in one of the user's chats
            const { data: isParticipant } = await supabase
              .from('chat_participants')
              .select('id')
              .eq('user_id', user.id)
              .eq('chat_id', payload.new.chat_id)
              .single();
            
            if (isParticipant) {
              setBadges(prev => ({ ...prev, chat: prev.chat + 1 }));
            }
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
    // Clear badge count (actual read marking happens per-chat in ChatPopup)
    if (tab === 'chat') {
      // The individual chat popup handles marking as read
    }

    // Clear the badge count
    setBadges(prev => ({
      ...prev,
      [tab]: 0
    }));
  };

  return { badges, clearBadge };
};