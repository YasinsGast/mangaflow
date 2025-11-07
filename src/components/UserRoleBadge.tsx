import React from 'react';
import { Crown, Users, Shield, Star } from 'lucide-react';
import { useUserRole } from '../hooks/useUserRole';

/**
 * Kullanıcı profilinde gösterilen role badge'i
 * - Admin: Kral tacı ikonu (mor)
 * - Moderator: Kalkan ikonu (mavi) 
 * - Fansub: Kullanıcı grubu ikonu (indigo)
 * - User: Yıldız ikonu (yeşil)
 */
export default function UserRoleBadge() {
  const { userRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-600/50">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
        Yükleniyor...
      </div>
    );
  }

  switch (userRole) {
    case 'admin':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200 border border-purple-500/30">
          <Crown className="h-3 w-3" />
          Admin
        </div>
      );

    case 'moderator':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-500/30">
          <Shield className="h-3 w-3" />
          Moderatör
        </div>
      );

    case 'fansub':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-200 border border-indigo-500/30">
          <Users className="h-3 w-3" />
          Fansub
        </div>
      );

    case 'user':
    default:
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/30">
          <Star className="h-3 w-3" />
          Kullanıcı
        </div>
      );
  }
}