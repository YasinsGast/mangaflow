import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Notification } from '../lib/supabase';

interface NotificationWithManga extends Notification {
  manga?: {
    title: string;
    slug: string;
    cover_image_url: string | null;
  };
  chapter?: {
    chapter_number: number;
  };
}

interface UseNotificationsReturn {
  notifications: NotificationWithManga[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationWithManga[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) {
        console.error('Notifications fetch error:', notifError);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!notifData || notifData.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Get unique manga IDs
      const mangaIds = [...new Set(notifData.map(n => n.manga_id))];

      // Fetch manga data
      const { data: mangaData } = await supabase
        .from('mangas')
        .select('id, title, slug, cover_image_url')
        .in('id', mangaIds);

      // Get unique chapter IDs (filter out nulls)
      const chapterIds = [...new Set(notifData.map(n => n.chapter_id).filter(Boolean))];

      // Fetch chapter data
      let chapterData: any[] = [];
      if (chapterIds.length > 0) {
        const { data } = await supabase
          .from('chapters')
          .select('id, chapter_number')
          .in('id', chapterIds);
        chapterData = data || [];
      }

      // Combine data
      const enrichedNotifications = notifData.map(notif => ({
        ...notif,
        manga: mangaData?.find(m => m.id === notif.manga_id),
        chapter: chapterData.find(c => c.id === notif.chapter_id)
      }));

      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('mark-notifications-read', {
        body: {
          notificationIds
        }
      });

      if (error) {
        throw error;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));

      // Optional: Show success toast
      const responseData = data?.data || data;
      if (responseData?.message) {
        // Silent update, no toast
      }
    } catch (err: any) {
      console.error('Mark as read error:', err);
      toast.error('Bildirimler güncellenemedi');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('mark-notifications-read', {
        body: {
          markAll: true
        }
      });

      if (error) {
        throw error;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      setUnreadCount(0);

      const responseData = data?.data || data;
      if (responseData?.message) {
        toast.success(responseData.message);
      } else {
        toast.success('Tüm bildirimler okundu olarak işaretlendi');
      }
    } catch (err: any) {
      console.error('Mark all as read error:', err);
      toast.error('İşlem başarısız oldu');
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription
    if (user) {
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Refresh notifications on any change
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  };
}
