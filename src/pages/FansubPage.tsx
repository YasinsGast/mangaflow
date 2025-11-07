import React, { useState, useEffect } from 'react';
import { FansubGuard } from '../components/RoleGuard';
import { BookOpen, Plus, Eye, CheckCircle, XCircle, Edit, Plus as PlusIcon, FileText, Clock } from 'lucide-react';
import { supabase, type Manga } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CreateMangaModal from '../components/CreateMangaModal';
import EditMangaModal from '../components/EditMangaModal';
import AddChapterModal from '../components/AddChapterModal';
import toast from 'react-hot-toast';


interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}
interface MangaItem {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  categories?: string[] | null;
  total_chapters: number;
  created_at: string;
  cover_image_url: string | null;
  description: string | null;
  author: string | null;
  artist: string | null;
  creator_id: string;
}

interface ChapterStats {
  pendingChapters: number;
  approvedChapters: number;
  rejectedChapters: number;
  totalChapters: number;
}

export default function FansubPage() {
  const [mangas, setMangas] = useState<MangaItem[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterStats>({
    pendingChapters: 0,
    approvedChapters: 0,
    rejectedChapters: 0,
    totalChapters: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingManga, setEditingManga] = useState<MangaItem | null>(null);
  const [addingChapterManga, setAddingChapterManga] = useState<MangaItem | null>(null);
  const { user } = useAuth();

  const loadMangas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mangas')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Manga\'lar yüklenirken hata:', error);
        toast.error('Manga\'lar yüklenirken hata oluştu');
        return;
      }

      setMangas(data as MangaItem[] || []);
      
      // Bölüm istatistiklerini yükle
      await loadChapterStats(data?.map(m => m.id) || []);
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadChapterStats = async (mangaIds: string[]) => {
    if (mangaIds.length === 0) {
      setChapterStats({
        pendingChapters: 0,
        approvedChapters: 0,
        rejectedChapters: 0,
        totalChapters: 0,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, approval_status')
        .in('manga_id', mangaIds);

      if (error) {
        console.error('Bölüm istatistikleri yüklenirken hata:', error);
        return;
      }

      const stats = {
        pendingChapters: data?.filter(c => c.approval_status === 'pending').length || 0,
        approvedChapters: data?.filter(c => c.approval_status === 'approved').length || 0,
        rejectedChapters: data?.filter(c => c.approval_status === 'rejected').length || 0,
        totalChapters: data?.length || 0,
      };

      setChapterStats(stats);
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    }
  };

  useEffect(() => {
    loadMangas();
  }, [user]);

  const getApprovalBadge = (status: MangaItem['approval_status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-900 text-green-200">
            <CheckCircle className="h-3 w-3" />
            Onaylandı
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-200">
            <Eye className="h-3 w-3" />
            Beklemede
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-900 text-red-200">
            <XCircle className="h-3 w-3" />
            Reddedildi
          </span>
        );
    }
  };

  const stats = {
    totalMangas: mangas.length,
    pendingMangas: mangas.filter(m => m.approval_status === 'pending').length,
    approvedMangas: mangas.filter(m => m.approval_status === 'approved').length,
    totalChapters: mangas.reduce((sum, m) => sum + m.total_chapters, 0),
  };

  const handleMangaUpdate = (updatedManga: any) => {
    setMangas(prev => 
      prev.map(m => m.id === updatedManga.id ? {
        ...m,
        ...updatedManga,
        total_chapters: m.total_chapters,
        created_at: m.created_at,
      } : m)
    );
    setEditingManga(null);
  };

  return (
    <FansubGuard>
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-indigo-400" />
                Fansub Panel
              </h1>
              <p className="text-gray-400 mt-2">
                Manga ve webtoon yönetim paneli
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-lg hover:shadow-indigo-600/50"
            >
              <Plus className="h-5 w-5" />
              Yeni Manga Ekle
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Toplam Manga */}
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-sm border border-blue-700/30 p-6 rounded-xl shadow-lg hover:shadow-blue-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">Toplam Manga</p>
                  <p className="text-3xl font-bold text-white">{stats.totalMangas}</p>
                </div>
                <div className="bg-blue-600/20 p-3 rounded-lg">
                  <BookOpen className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Bekleyen Onay (Manga) */}
            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 backdrop-blur-sm border border-yellow-700/30 p-6 rounded-xl shadow-lg hover:shadow-yellow-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-300 text-sm font-medium mb-1">Bekleyen Manga Onayı</p>
                  <p className="text-3xl font-bold text-white">{stats.pendingMangas}</p>
                </div>
                <div className="bg-yellow-600/20 p-3 rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Bekleyen Bölüm Onayı */}
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 backdrop-blur-sm border border-orange-700/30 p-6 rounded-xl shadow-lg hover:shadow-orange-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm font-medium mb-1">Bekleyen Bölüm Onayı</p>
                  <p className="text-3xl font-bold text-white">{chapterStats.pendingChapters}</p>
                </div>
                <div className="bg-orange-600/20 p-3 rounded-lg">
                  <Eye className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Onaylanan Bölümler */}
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 backdrop-blur-sm border border-green-700/30 p-6 rounded-xl shadow-lg hover:shadow-green-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium mb-1">Onaylanan Bölümler</p>
                  <p className="text-3xl font-bold text-white">{chapterStats.approvedChapters}</p>
                </div>
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </div>

            {/* Toplam Bölüm */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 backdrop-blur-sm border border-purple-700/30 p-6 rounded-xl shadow-lg hover:shadow-purple-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm font-medium mb-1">Toplam Bölüm</p>
                  <p className="text-3xl font-bold text-white">{chapterStats.totalChapters}</p>
                </div>
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <FileText className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Onaylanan Manga */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 backdrop-blur-sm border border-emerald-700/30 p-6 rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 text-sm font-medium mb-1">Onaylanan Manga</p>
                  <p className="text-3xl font-bold text-white">{stats.approvedMangas}</p>
                </div>
                <div className="bg-emerald-600/20 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Reddedilen Bölümler */}
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 backdrop-blur-sm border border-red-700/30 p-6 rounded-xl shadow-lg hover:shadow-red-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium mb-1">Reddedilen Bölümler</p>
                  <p className="text-3xl font-bold text-white">{chapterStats.rejectedChapters}</p>
                </div>
                <div className="bg-red-600/20 p-3 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
              </div>
            </div>

            {/* Ortalama */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 backdrop-blur-sm border border-indigo-700/30 p-6 rounded-xl shadow-lg hover:shadow-indigo-600/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-sm font-medium mb-1">Manga Başına Bölüm</p>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalMangas > 0 ? (chapterStats.totalChapters / stats.totalMangas).toFixed(1) : '0.0'}
                  </p>
                </div>
                <div className="bg-indigo-600/20 p-3 rounded-lg">
                  <Plus className="h-8 w-8 text-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Manga List */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-indigo-400" />
                Manga'larım
              </h2>
              <button
                onClick={loadMangas}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loading ? 'Yükleniyor...' : 'Yenile'}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mangas.map((manga) => (
                  <div key={manga.id} className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group">
                    {manga.cover_image_url ? (
                      <div className="relative overflow-hidden">
                        <img 
                          src={manga.cover_image_url} 
                          alt={manga.title}
                          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                      </div>
                    ) : (
                      <div className="w-full h-56 bg-gray-600 flex items-center justify-center">
                        <BookOpen className="h-20 w-20 text-gray-500" />
                      </div>
                    )}
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg line-clamp-1 flex-1">{manga.title}</h3>
                        {getApprovalBadge(manga.approval_status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {manga.total_chapters} bölüm
                        </span>
                        <span className="capitalize px-2 py-1 bg-gray-600/50 rounded text-xs">
                          {manga.status === 'ongoing' ? 'Devam Ediyor' : 
                           manga.status === 'completed' ? 'Tamamlandı' : 'Ara Verdi'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingManga(manga)}
                          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Düzenle
                        </button>
                        <button 
                          onClick={() => setAddingChapterManga(manga)}
                          className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {mangas.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="bg-gray-700/30 backdrop-blur-sm border border-gray-600/50 rounded-xl p-12 max-w-md mx-auto">
                      <BookOpen className="h-20 w-20 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Henüz manga eklemediniz</h3>
                      <p className="text-gray-400 mb-6">İlk manga'nızı ekleyerek başlayın</p>
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                      >
                        İlk Manga'nızı Ekleyin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Manga Modal */}
      <CreateMangaModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onMangaCreated={() => {
          setShowCreateModal(false);
          loadMangas();
        }}
      />

      {/* Edit Manga Modal */}
      {editingManga && (
        <EditMangaModal
          manga={{
            ...editingManga,
            status: (editingManga.status as 'ongoing' | 'completed' | 'hiatus') || 'ongoing',
            cover_image_url: editingManga.cover_image_url || null,
            description: editingManga.description || null,
            author: editingManga.author || null,
            artist: editingManga.artist || null,
            categories: (editingManga.categories as string[]) || []
          } as Manga & { categories?: Category[] }}
          isOpen={true}
          onClose={() => setEditingManga(null)}
          onUpdate={handleMangaUpdate}
        />
      )}

      {/* Add Chapter Modal */}
      {addingChapterManga && (
        <AddChapterModal
          isOpen={true}
          onClose={() => setAddingChapterManga(null)}
          manga={addingChapterManga}
          onChapterAdded={() => {
            setAddingChapterManga(null);
            loadMangas();
          }}
        />
      )}
    </FansubGuard>
  );
}
