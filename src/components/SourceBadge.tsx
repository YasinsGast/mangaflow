import React from 'react';
import { Crown, Users, Shield, Star, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SourceBadgeProps {
  creatorId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  className?: string;
}

interface UserProfile {
  id: string;
  username: string;
  user_role: 'user' | 'fansub' | 'moderator' | 'admin';
}

/**
 * Manga kaynak badge'ini gösterir
 * - Admin içerikleri: "Resmi İçerik" (kral tacı ikonu)
 * - Fansub içerikleri: "Fansub" (kullanıcı ikonu) 
 * - Moderator içerikleri: "Moderatör İçeriği" (kalkan ikonu)
 * - Kullanıcı içerikleri: "Topluluk İçeriği" (yıldız ikonu)
 */
export default function SourceBadge({ creatorId, approvalStatus, className = '' }: SourceBadgeProps) {
  const [creatorProfile, setCreatorProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    async function fetchCreatorProfile() {
      if (!creatorId) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, user_role')
          .eq('id', creatorId)
          .maybeSingle();

        if (error) {
          console.error('Profil yüklenirken hata:', error);
          return;
        }

        setCreatorProfile(data);
      } catch (error) {
        console.error('Beklenmeyen hata:', error);
      }
    }

    fetchCreatorProfile();
  }, [creatorId]);

  // Onay bekleyen içerikler için özel gösterim
  if (approvalStatus === 'pending') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-200 border border-yellow-500/30 ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
        Onay Bekliyor
      </div>
    );
  }

  // Onaylanmamış içerikler için gösterim
  if (approvalStatus === 'rejected') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-200 border border-red-500/30 ${className}`}>
        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        Reddedildi
      </div>
    );
  }

  // Onaylanmış içerikler için kaynak badge'i
  if (!creatorProfile) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-800/50 text-gray-300 border border-gray-600/50 ${className}`}>
        <Sparkles className="h-3 w-3" />
        Resmi İçerik
      </div>
    );
  }

  // Creator role'e göre badge seç
  switch (creatorProfile.user_role) {
    case 'admin':
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200 border border-purple-500/30 ${className}`}>
          <Crown className="h-3 w-3" />
          Resmi İçerik
        </div>
      );

    case 'moderator':
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-500/30 ${className}`}>
          <Shield className="h-3 w-3" />
          Moderatör İçeriği
        </div>
      );

    case 'fansub':
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-200 border border-indigo-500/30 ${className}`}>
          <Users className="h-3 w-3" />
          Fansub
        </div>
      );

    case 'user':
    default:
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/30 ${className}`}>
          <Star className="h-3 w-3" />
          Topluluk İçeriği
        </div>
      );
  }
}