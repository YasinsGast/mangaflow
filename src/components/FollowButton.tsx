import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { useFollow } from '../hooks/useFollow';

interface FollowButtonProps {
  mangaId: string;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ mangaId, className = '' }) => {
  const { isFollowing, isLoading, toggleFollow } = useFollow(mangaId);

  return (
    <motion.button
      onClick={toggleFollow}
      disabled={isLoading}
      className={`
        relative px-6 py-3 rounded-xl font-semibold
        transition-all duration-300
        ${isFollowing
          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-2 border-emerald-500/40'
          : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-blue-300 border-2 border-blue-500/40'
        }
        hover:shadow-lg hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed
        backdrop-blur-sm
        ${className}
      `}
      whileHover={{ scale: isLoading ? 1 : 1.05 }}
      whileTap={{ scale: isLoading ? 1 : 0.95 }}
    >
      <div className="flex items-center gap-2">
        {isFollowing ? (
          <>
            <Check className="w-5 h-5" />
            <span>Takip Ediliyor</span>
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" />
            <span>Takip Et</span>
          </>
        )}
      </div>

      {isFollowing && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
};
