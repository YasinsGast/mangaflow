import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export interface Bookmark {
  id: string;
  user_id: string;
  manga_id: string; // UUID olarak string
  chapter_id: string;
  page_number: number;
  created_at: string;
  updated_at: string;
}

export interface BookmarkInput {
  manga_id: string;
  chapter_id: string;
  page_number: number;
}

export interface BookmarkWithManga extends Bookmark {
  manga_title?: string;
  manga_slug?: string;
  manga_cover_url?: string;
  chapter_number?: number;
}

export function useBookmark() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  /**
   * Bookmark kaydetme veya güncelleme (Bölüm seviyesinde)
   * Aynı kullanıcının aynı manga'daki aynı bölümü için bookmark varsa günceller, yoksa yeni oluşturur
   */
  const saveBookmark = useCallback(async (input: BookmarkInput): Promise<boolean> => {
    console.log('[useBookmark] saveBookmark çağrıldı (bölüm seviyesi)', {
      input,
      user: user?.id,
      isAuthenticated: !!user
    });

    if (!user) {
      console.warn('[useBookmark] Kullanıcı giriş yapmamış');
      return false;
    }

    try {
      setLoading(true);

      // Mevcut bookmark'u kontrol et (kullanıcı, manga, bölüm seviyesinde)
      const { data: existing, error: selectError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', input.manga_id)
        .eq('chapter_id', input.chapter_id)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existing) {
        // Mevcut bookmark'u güncelle
        const { error: updateError } = await supabase
          .from('bookmarks')
          .update({
            page_number: input.page_number,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Yeni bookmark oluştur
        const { error: insertError } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            manga_id: input.manga_id,
            chapter_id: input.chapter_id,
            page_number: input.page_number,
          });

        if (insertError) {
          throw insertError;
        }
      }

      console.log('[useBookmark] Bölüm bookmark\'u başarıyla kaydedildi');
      return true;
    } catch (error: any) {
      console.error('[useBookmark] Bookmark kaydetme hatası:', error);
      const errorMsg = error?.message || 'Bilinmeyen hata';
      toast.error(`Hata: ${errorMsg}`, {
        duration: 4000
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]); // useCallback dependency array

  /**
   * Belirli bir manga için en son bookmark'ı getirme (en güncel okuma pozisyonu)
   */
  const getBookmark = useCallback(async (mangaId: string): Promise<Bookmark | null> => {
    if (!user) return null;

    try {
      // En güncel bookmark'ı getir (en son güncellenen)
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting bookmark:', error);
      return null;
    }
  }, [user]); // useCallback dependency array

  /**
   * Belirli bir manga ve bölüm için bookmark getirme
   */
  const getChapterBookmark = useCallback(async (mangaId: string, chapterId: string): Promise<Bookmark | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting chapter bookmark:', error);
      return null;
    }
  }, [user]); // useCallback dependency array

  /**
   * Kullanıcının tüm bookmark'larını getirme (manga bilgileriyle birlikte)
   */
  const getAllBookmarks = useCallback(async (): Promise<BookmarkWithManga[]> => {
    console.log('[useBookmark] getAllBookmarks çağrıldı', { userId: user?.id });

    if (!user) {
      console.warn('[useBookmark] getAllBookmarks için kullanıcı giriş yapmamış');
      return [];
    }

    try {
      setLoading(true);

      // Bookmark'ları getir
      console.log('[useBookmark] Database\'den bookmark\'lar getiriliyor...');
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (bookmarksError) {
        console.error('[useBookmark] Bookmark getirme hatası:', bookmarksError);
        throw bookmarksError;
      }

      console.log('[useBookmark] Getirilen bookmark sayısı:', bookmarks?.length || 0);

      if (!bookmarks || bookmarks.length === 0) {
        console.log('[useBookmark] Hiç bookmark bulunamadı');
        return [];
      }

      // Manga bilgilerini getir
      const mangaIds = bookmarks.map(b => b.manga_id);
      console.log('[useBookmark] Manga bilgileri getiriliyor:', mangaIds);

      const { data: mangas, error: mangasError } = await supabase
        .from('mangas')
        .select('id, title, slug, cover_image_url')
        .in('id', mangaIds);

      if (mangasError) {
        console.error('[useBookmark] Manga getirme hatası:', mangasError);
        throw mangasError;
      }

      console.log('[useBookmark] Getirilen manga sayısı:', mangas?.length || 0);

      // Chapter bilgilerini getir
      const chapterIds = bookmarks.map(b => b.chapter_id);
      console.log('[useBookmark] Chapter bilgileri getiriliyor:', chapterIds);

      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, chapter_number')
        .in('id', chapterIds);

      if (chaptersError) {
        console.error('[useBookmark] Chapter getirme hatası:', chaptersError);
        throw chaptersError;
      }

      console.log('[useBookmark] Getirilen chapter sayısı:', chapters?.length || 0);

      // Birleştir
      const bookmarksWithManga: BookmarkWithManga[] = bookmarks.map(bookmark => {
        const manga = mangas?.find(m => m.id === bookmark.manga_id);
        const chapter = chapters?.find(c => c.id === bookmark.chapter_id);

        return {
          ...bookmark,
          manga_title: manga?.title,
          manga_slug: manga?.slug,
          manga_cover_url: manga?.cover_image_url,
          chapter_number: chapter?.chapter_number,
        };
      });

      console.log('[useBookmark] Bookmark\'lar manga bilgisi ile birleştirildi:', bookmarksWithManga.length);
      return bookmarksWithManga;
    } catch (error: any) {
      console.error('[useBookmark] getAllBookmarks hatası:', error);
      const errorMsg = error?.message || 'Bilinmeyen hata';
      toast.error(`Bookmark yükleme hatası: ${errorMsg}`, {
        duration: 4000
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]); // useCallback dependency array

  /**
   * Bookmark silme (bölüm seviyesinde)
   */
  const deleteBookmark = useCallback(async (mangaId: string, chapterId?: string): Promise<boolean> => {
    if (!user) {
      toast.error('Bu işlem için giriş yapmalısınız');
      return false;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('manga_id', mangaId);

      // Eğer chapterId belirtilmişse sadece o bölümü sil
      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { error } = await query;

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error deleting bookmark:', error);
      toast.error('Silme işlemi başarısız oldu');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]); // useCallback dependency array

  return {
    saveBookmark,
    getBookmark,
    getChapterBookmark,
    getAllBookmarks,
    deleteBookmark,
    loading,
    isAuthenticated: !!user,
  };
}
