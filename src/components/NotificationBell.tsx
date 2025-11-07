import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    isConnected,
  } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chapter_update':
        return '📚';
      case 'comment_reply':
        return '💬';
      case 'like_notification':
        return '👍';
      case 'follow_notification':
        return '👥';
      case 'admin_message':
        return '📢';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
      setShowDropdown(false);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) {
      await clearAllNotifications();
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  // Don't render if user is not authenticated
  if (loading && notifications.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <motion.button
        className="relative p-2 rounded-lg text-text-primary hover:bg-bg-elevated transition-colors"
        onClick={() => setShowDropdown(!showDropdown)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="h-5 w-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-semibold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* Connection Indicator */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-gray-400'
        }`} />
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-96 max-h-96 bg-bg-primary border border-border-primary rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">
                    Bildirimler
                    {unreadCount > 0 && (
                      <span className="ml-2 text-sm text-accent-primary">
                        ({unreadCount} okunmamış)
                      </span>
                    )}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-accent-primary hover:text-accent-secondary transition-colors flex items-center gap-1"
                        title="Tümünü okundu işaretle"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Tümü okundu
                      </button>
                    )}
                    
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        title="Tüm bildirimleri sil"
                      >
                        <Trash2 className="h-3 w-3" />
                        Temizle
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-text-secondary">
                    Bildirimler yükleniyor...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Henüz bildiriminiz yok</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 border-b border-border-primary hover:bg-bg-elevated cursor-pointer transition-colors group relative ${
                        !notification.is_read ? 'bg-accent-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Notification Icon */}
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium truncate ${
                              !notification.is_read ? 'text-text-primary' : 'text-text-secondary'
                            }`}>
                              {notification.title}
                            </h4>
                            
                            {/* Unread Indicator */}
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-accent-primary rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          
                          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-text-muted">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: tr,
                              })}
                            </span>
                            
                            {notification.action_url && (
                              <ExternalLink className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-accent-primary hover:text-accent-secondary transition-colors"
                              title="Okundu işaretle"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Sil"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-border-primary text-center">
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setShowDropdown(false);
                    }}
                    className="text-xs text-accent-primary hover:text-accent-secondary transition-colors"
                  >
                    Tüm bildirimleri görüntüle
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;