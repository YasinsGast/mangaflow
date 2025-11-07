import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  BookOpen,
  Loader2,
  Calendar,
  User
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Navbar from '@/components/Navbar';
import ParticleSystem from '@/components/ParticleSystem';

interface PendingChapter {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string | null;
  created_by: string;
  created_at: string;
  status: string;
  // Manga bilgileri
  manga?: {
    title: string;
    slug: string;
    creator_id: string;
  };
  // Creator bilgileri
  creator?: {
    id: string;
    username: string;
  };
}

export default function AdminApprovalPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [pendingChapters, setPendingChapters] = useState<PendingChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    console.log('AdminApprovalPage useEffect - isAdmin:', isAdmin, 'roleLoading:', roleLoading);
    
    // Role loading durumunda bekle
    if (roleLoading) {
      console.log('Role loading, waiting...');
      // Loading durumunda error'u temizle
      setError(null);
      setLoading(true);
      return;
    }
    
    // Admin kontrolü
    if (!isAdmin) {
      console.log('User is not admin, showing error');
      setError('Bu sayfaya erişim yetkiniz yok.');
      setLoading(false);
      return;
    }
    
    console.log('User is admin, fetching chapters');
    // Admin ise error'u temizle ve veri yükle
    setError(null);
    fetchPendingChapters();
  }, [isAdmin, roleLoading]);

  const fetchPendingChapters = async () => {
    try {
      console.log('fetchPendingChapters called');
      setLoading(true);
      setError(null);
      
      // First, get pending chapters without relationships
      const { data, error } = await supabase
        .from('pending_chapters')
        .select(`
          id,
          manga_id,
          chapter_number,
          title,
          created_by,
          created_at,
          status
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Pending chapters data:', data);

      // Manually fetch manga and creator info for each chapter
      const chaptersWithDetails = await Promise.all(
        (data || []).map(async (chapter: any) => {
          // Get manga info
          const { data: mangaData } = await supabase
            .from('mangas')
            .select('title, slug, creator_id')
            .eq('id', chapter.manga_id)
            .maybeSingle();

          // Get creator info
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', chapter.created_by)
            .maybeSingle();

          return {
            ...chapter,
            manga: mangaData,
            creator: creatorData
          };
        })
      );

      console.log('Chapters with details:', chaptersWithDetails);
      setPendingChapters(chaptersWithDetails);
    } catch (error: any) {
      console.error('Onay bekleyen bölümler yüklenirken hata:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      console.log('fetchPendingChapters finished, loading set to false');
    }
  };

  const sendApprovalNotification = async (chapterId: string) => {
    try {
      // Chapter detaylarını ve creator bilgilerini al
      const chapter = pendingChapters.find(c => c.id === chapterId);
      if (!chapter || !chapter.creator) {
        console.log('Chapter or creator not found for notification');
        return;
      }

      const notification = {
        user_id: chapter.created_by,
        type: 'chapter_approved',
        title: 'Bölümünüz Onaylandı! 🎉',
        content: `${chapter.manga?.title || 'Bilinmeyen Manga'} - Bölüm ${chapter.chapter_number} bölümünüz onaylandı ve yayınlandı.`,
        message: `Merhaba ${chapter.creator.username}, "${chapter.title || `Bölüm ${chapter.chapter_number}`}" başlıklı bölümünüz başarıyla onaylanmıştır. Bölümünüz artık kullanıcılar tarafından okunabilir durumda.`,
        manga_id: chapter.manga_id,
        chapter_id: chapterId,
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        console.error('Bildirim gönderilirken hata:', error);
        return;
      }

      console.log('Bildirim başarıyla gönderildi');
    } catch (error) {
      console.error('Bildirim gönderilirken beklenmeyen hata:', error);
    }
  };

  const handleApprove = async (chapterId: string) => {
    try {
      console.log('handleApprove called for chapter:', chapterId);
      setProcessingId(chapterId);
      
      const updateData: any = {
        status: 'approved',
        approved_at: new Date().toISOString(),
      };

      // approved_by'yi sadece user id varsa ekle
      if (user?.id) {
        updateData.approved_by = user.id;
        console.log('Approved by set to:', user.id);
      } else {
        console.log('No user ID available');
      }

      console.log('Update data:', updateData);

      const { error } = await supabase
        .from('pending_chapters')
        .update(updateData)
        .eq('id', chapterId);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('Update data that failed:', updateData);
        console.error('Chapter ID:', chapterId);
        throw error;
      }

      console.log('Chapter approved successfully');
      
      // Bildirim gönder
      await sendApprovalNotification(chapterId);
      
      // Listeden kaldır
      setPendingChapters(prev => prev.filter(c => c.id !== chapterId));
      
    } catch (error: any) {
      console.error('Bölüm onaylanırken hata:', error);
      alert('Bölüm onaylanırken hata oluştu: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const sendRejectionNotification = async (chapterId: string) => {
    try {
      // Chapter detaylarını ve creator bilgilerini al
      const chapter = pendingChapters.find(c => c.id === chapterId);
      if (!chapter || !chapter.creator) {
        console.log('Chapter or creator not found for rejection notification');
        return;
      }

      const notification = {
        user_id: chapter.created_by,
        type: 'chapter_rejected',
        title: 'Bölümünüz Reddedildi 📝',
        content: `${chapter.manga?.title || 'Bilinmeyen Manga'} - Bölüm ${chapter.chapter_number} bölümünüz reddedildi.`,
        message: `Merhaba ${chapter.creator.username}, "${chapter.title || `Bölüm ${chapter.chapter_number}`}" başlıklı bölümünüz reddedilmiştir. Lütfen bölümü gözden geçirip tekrar deneyebilirsiniz.`,
        manga_id: chapter.manga_id,
        chapter_id: chapterId,
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) {
        console.error('Red bildirimi gönderilirken hata:', error);
        return;
      }

      console.log('Red bildirimi başarıyla gönderildi');
    } catch (error) {
      console.error('Red bildirimi gönderilirken beklenmeyen hata:', error);
    }
  };

  const handleReject = async (chapterId: string) => {
    if (!confirm('Bu bölümü reddetmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setProcessingId(chapterId);
      
      const { error } = await supabase
        .from('pending_chapters')
        .update({ status: 'rejected' })
        .eq('id', chapterId);

      if (error) throw error;

      // Red bildirimi gönder
      await sendRejectionNotification(chapterId);

      // Listeden kaldır
      setPendingChapters(prev => prev.filter(c => c.id !== chapterId));
      
    } catch (error: any) {
      console.error('Bölüm reddedilirken hata:', error);
      alert('Bölüm reddedilirken hata oluştu: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <ParticleSystem />
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-slate-300">Onay bekleyen bölümler yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <ParticleSystem />
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ParticleSystem />
      <Navbar />
      
      <div className="pt-24 px-4 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              Onay Bekleyen Bölümler
            </h1>
            <p className="text-slate-300">
              Fansub'lar tarafından gönderilen bölümler
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300">
                <Clock className="h-4 w-4" />
                {pendingChapters.length} bölüm onay bekliyor
              </span>
            </div>
          </motion.div>

          {/* Pending Chapters */}
          {pendingChapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Tüm bölümler onaylandı!
              </h3>
              <p className="text-slate-400">
                Şu anda onay bekleyen herhangi bir bölüm bulunmuyor.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {pendingChapters.map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Manga ve Bölüm Bilgileri */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">
                            {chapter.manga?.title || 'Bilinmeyen Manga'}
                          </h3>
                          <div className="flex items-center gap-4 text-slate-400">
                            <span className="bg-purple-600/20 px-3 py-1 rounded-full text-purple-300">
                              Bölüm {chapter.chapter_number}
                            </span>
                            {chapter.title && (
                              <span className="text-sm">{chapter.title}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Creator ve Tarih Bilgileri */}
                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{chapter.creator?.username || 'Bilinmeyen Kullanıcı'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(chapter.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 ml-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (chapter.manga?.slug) {
                            window.open(`/read/${chapter.manga.slug}/${chapter.chapter_number}`, '_blank');
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Görüntüle
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReject(chapter.id)}
                        disabled={processingId === chapter.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white transition-colors"
                      >
                        {processingId === chapter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reddet
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApprove(chapter.id)}
                        disabled={processingId === chapter.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white transition-colors"
                      >
                        {processingId === chapter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Onayla
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}