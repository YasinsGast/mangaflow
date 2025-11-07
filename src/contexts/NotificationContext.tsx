import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  type: string; // Make type more flexible to match database
  title: string;
  message: string;
  content: string;
  data?: any; // Make data optional since it might not come from database
  is_read: boolean;
  created_at: string;
  manga_id?: string;
  chapter_id?: string;
  action_url?: string;
  expires_at?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const isAuthenticated = !!user;

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Bildirimler yüklenirken hata oluştu');
        return;
      }

      // Add default data field if missing and cast to proper type
      const notificationsWithData = (data || []).map(notification => ({
        ...notification,
        data: (notification as any).data || {}
      })) as Notification[];

      setNotifications(notificationsWithData);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      toast.error('Bildirimler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        toast.error('Bildirim okundu olarak işaretlenirken hata oluştu');
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
      toast.error('Bildirim okundu olarak işaretlenirken hata oluştu');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Tüm bildirimler okundu olarak işaretlenirken hata oluştu');
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      toast.error('Tüm bildirimler okundu olarak işaretlenirken hata oluştu');
    }
  };

  // Delete single notification
  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        toast.error('Bildirim silinirken hata oluştu');
        return;
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Bildirim silindi');
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      toast.error('Bildirim silinirken hata oluştu');
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing all notifications:', error);
        toast.error('Tüm bildirimler silinirken hata oluştu');
        return;
      }

      setNotifications([]);
      toast.success('Tüm bildirimler silindi');
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
      toast.error('Tüm bildirimler silinirken hata oluştu');
    }
  };

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      return;
    }

    console.log('[NotificationContext] Setting up real-time subscription for user:', user.id);

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[NotificationContext] Real-time notification change:', payload);

          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
            
            // Show toast for new notification
            toast.success(newNotification.title, {
              icon: '🔔',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationContext] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[NotificationContext] Cleaning up subscription');
      subscription.unsubscribe();
      setIsConnected(false);
    };
  }, [user?.id]);

  // Initial fetch when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [isAuthenticated, user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;