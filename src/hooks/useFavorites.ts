import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Favorite {
  id: string;
  user_id: string;
  manga_id: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Kullanıcının tüm favorilerini yükle
  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('favorites')
          .select('manga_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const favoriteIds = new Set(data?.map(f => f.manga_id) || []);
        setFavorites(favoriteIds);
      } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  // Bir manga'nın favorilerde olup olmadığını kontrol et
  const isFavorite = useCallback((mangaId: string) => {
    return favorites.has(mangaId);
  }, [favorites]);

  // Favoriye ekle/çıkar (toggle)
  const toggleFavorite = useCallback(async (mangaId: string) => {
    if (!user) {
      // Giriş yapmamış kullanıcılar için toast uyarısı
      toast.error('Favorilere eklemek için giriş yapmalısınız', {
        duration: 3000,
        icon: '🔒',
      });
      return { success: false, error: 'Favorilere eklemek için giriş yapmalısınız' };
    }

    const isCurrentlyFavorite = favorites.has(mangaId);

    // Optimistic update - UI'ı hemen güncelle
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isCurrentlyFavorite) {
        newFavorites.delete(mangaId);
      } else {
        newFavorites.add(mangaId);
      }
      return newFavorites;
    });

    try {
      if (isCurrentlyFavorite) {
        // Favorilerden çıkar
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('manga_id', mangaId);

        if (error) throw error;
        
        toast.success('Favorilerden çıkarıldı', {
          icon: '💔',
        });
        
        return { success: true, action: 'removed' };
      } else {
        // Favorilere ekle
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            manga_id: mangaId,
          });

        if (error) throw error;
        
        toast.success('Favorilere eklendi!', {
          icon: '❤️',
        });
        
        return { success: true, action: 'added' };
      }
    } catch (error: any) {
      console.error('Favori işlemi başarısız:', error);
      
      // Hata durumunda geri al (rollback optimistic update)
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isCurrentlyFavorite) {
          newFavorites.add(mangaId);
        } else {
          newFavorites.delete(mangaId);
        }
        return newFavorites;
      });

      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.', {
        icon: '⚠️',
      });

      return { success: false, error: error.message || 'Favori işlemi başarısız' };
    }
  }, [user, favorites]);

  // Favorilere eklenen manga'ların detaylarını getir
  const getFavoriteMangas = useCallback(async () => {
    if (!user || favorites.size === 0) {
      return [];
    }

    try {
      const favoriteIds = Array.from(favorites);
      
      const { data, error } = await supabase
        .from('mangas')
        .select('*')
        .in('id', favoriteIds)
        .order('title', { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Favori mangalar getirilirken hata:', error);
      return [];
    }
  }, [user, favorites]);

  return {
    favorites: Array.from(favorites),
    isFavorite,
    toggleFavorite,
    getFavoriteMangas,
    loading,
    isAuthenticated: !!user,
  };
}
