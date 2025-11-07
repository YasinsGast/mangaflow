import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    // Navigation logic based on notification type
    const { type, manga, chapter } = notification;

    switch (type) {
      case 'chapter_approved':
        // Navigate to approved chapter
        if (manga?.slug && chapter?.chapter_number) {
          navigate(`/read/${manga.slug}/${chapter.chapter_number}`);
          setIsOpen(false);
        }
        break;

      case 'chapter_rejected':
        // Navigate to dashboard to see pending chapters
        navigate('/dashboard');
        setIsOpen(false);
        break;

      case 'manga_approved':
        // Navigate to manga detail page
        if (manga?.slug) {
          navigate(`/manga/${manga.slug}`);
          setIsOpen(false);
        }
        break;

      case 'manga_rejected':
        // Navigate to dashboard to see manga status
        navigate('/dashboard');
        setIsOpen(false);
        break;

      default:
        // For other notification types, close dropdown
        setIsOpen(false);
        break;
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Az önce';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-blue-300 hover:bg-white/5 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-6 h-6" />
        
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 max-h-[32rem] overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-blue-500/20 shadow-2xl z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-blue-100">Bildirimler</h3>
                
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tümünü Okundu İşaretle</span>
                  </button>
                )}
              </div>

              {unreadCount > 0 && (
                <p className="text-sm text-blue-300 mt-1">
                  {unreadCount} okunmamış bildirim
                </p>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center text-blue-300">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2">Yükleniyor...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-blue-300">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold">Bildiriminiz yok</p>
                  <p className="text-sm text-blue-400 mt-1">
                    Manga takip ettiğinizde yeni bölümler için bildirim alacaksınız
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-blue-500/10">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        p-4 cursor-pointer transition-all
                        hover:bg-blue-500/5
                        ${!notification.is_read ? 'bg-purple-500/5' : ''}
                      `}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex gap-3">
                        {/* Manga Cover */}
                        {notification.manga?.cover_image_url && (
                          <img
                            src={notification.manga.cover_image_url}
                            alt={notification.manga.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-semibold text-sm ${!notification.is_read ? 'text-blue-100' : 'text-blue-300'}`}>
                              {notification.title}
                            </h4>
                            
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>
                            )}
                          </div>

                          <p className="text-sm text-blue-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-blue-500">
                              {formatTimeAgo(notification.created_at)}
                            </span>

                            {notification.chapter && (
                              <span className="flex items-center gap-1 text-xs text-purple-400">
                                <ExternalLink className="w-3 h-3" />
                                Bölüm {notification.chapter.chapter_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 64, 175, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};
