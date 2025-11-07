import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export interface ReadingListItem {
  id: string;
  user_id: string;
  manga_id: string;
  manga_title?: string;
  manga_slug?: string;
  manga_cover_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ReadingListInput {
  manga_id: string;
  manga_title?: string;
  manga_slug?: string;
  manga_cover_url?: string;
}

export function useReadingList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  /**
   * Manga'yı okuma listesine ekle
   */
  const addToReadingList = useCallback(async (input: ReadingListInput): Promise<boolean> => {
    console.log('[useReadingList] addToReadingList çağrıldı', {
      input,
      user: user?.id,
      isAuthenticated: !!user
    });

    if (!user) {
      console.warn('[useReadingList] Kullanıcı giriş yapmamış');
      toast.error('Manga\'yı listeye eklemek için giriş yapmalısınız', {
        duration: 4000,
        position: 'top-center'
      });
      return false;
    }

    try {
      setLoading(true);

      // Önce zaten listede olup olmadığını kontrol et
      const { data: existing, error: selectError } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', input.manga_id)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existing) {
        // Zaten listede varsa bilgi ver
        console.log('[useReadingList] Manga zaten okuma listesinde mevcut');
        return true;
      }

      // Yeni manga'yı listeye ekle
      const { error: insertError } = await supabase
        .from('reading_lists')
        .insert({
          user_id: user.id,
          manga_id: input.manga_id,
          manga_title: input.manga_title,
          manga_slug: input.manga_slug,
          manga_cover_url: input.manga_cover_url,
        });

      if (insertError) {
        throw insertError;
      }

      console.log('[useReadingList] Manga okuma listesine başarıyla eklendi');
      toast.success('Manga okuma listesine eklendi', {
        duration: 3000,
        position: 'top-center'
      });
      return true;
    } catch (error: any) {
      console.error('[useReadingList] Okuma listesine ekleme hatası:', error);
      const errorMsg = error?.message || 'Bilinmeyen hata';
      toast.error(`Hata: ${errorMsg}`, {
        duration: 4000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Manga'yı okuma listesinden kaldır
   */
  const removeFromReadingList = useCallback(async (mangaId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Bu işlem için giriş yapmalısınız');
      return false;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('reading_lists')
        .delete()
        .eq('user_id', user.id)
        .eq('manga_id', mangaId);

      if (error) throw error;

      toast.success('Manga okuma listesinden kaldırıldı');
      return true;
    } catch (error: any) {
      console.error('Error removing from reading list:', error);
      toast.error('Kaldırma işlemi başarısız oldu');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Manga'nın okuma listesinde olup olmadığını kontrol et
   */
  const isInReadingList = useCallback(async (mangaId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('reading_lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle();

      if (error) {
        console.error('Error checking reading list:', error);
        return false;
      }

      return !!data;
    } catch (error: any) {
      console.error('Error checking reading list:', error);
      return false;
    }
  }, [user]);

  /**
   * Kullanıcının tüm okuma listesini getir
   */
  const getReadingList = useCallback(async (): Promise<ReadingListItem[]> => {
    console.log('[useReadingList] getReadingList çağrıldı', { userId: user?.id });

    if (!user) {
      console.warn('[useReadingList] getReadingList için kullanıcı giriş yapmamış');
      return [];
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useReadingList] Okuma listesi getirme hatası:', error);
        throw error;
      }

      console.log('[useReadingList] Getirilen okuma listesi item\'ları:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('[useReadingList] getReadingList hatası:', error);
      const errorMsg = error?.message || 'Bilinmeyen hata';
      toast.error(`Okuma listesi yükleme hatası: ${errorMsg}`, {
        duration: 4000
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    addToReadingList,
    removeFromReadingList,
    isInReadingList,
    getReadingList,
    loading,
    isAuthenticated: !!user,
  };
}
