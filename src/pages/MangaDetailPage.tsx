import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star,
  Eye,
  Bookmark,
  Share2,
  Heart,
  ChevronRight,
  Clock,
  Calendar,
  Flag,
  PlayCircle,
  BookOpen,
  Loader2,
  BookmarkCheck,
  Tag
} from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import SourceBadge from '@/components/SourceBadge';
import AddChapterModal from '@/components/AddChapterModal';
import { FollowButton } from '@/components/FollowButton';
import { StarRating, CompactStarRating } from '@/components/StarRating';
import { RatingModal } from '@/components/RatingModal';
import { supabase } from '@/lib/supabase';
import type { Manga, Chapter } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';
import { useBookmark } from '@/hooks/useBookmark';
import { useReadingList } from '@/hooks/useReadingList';
import { useUserRole } from '@/hooks/useUserRole';
import { useRating, type RatingStats } from '@/hooks/useRating';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Edit3, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import EditMangaModal from '@/components/EditMangaModal';
import EditChapterModal from '@/components/EditChapterModal';
import DeleteChapterModal from '@/components/DeleteChapterModal';
import CommentList from '@/components/CommentList';

export default function MangaDetailPage() {
  const { user } = useAuth();
  const { slug } = useParams();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Favorites hook
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  
  // Bookmark hook
  const { getBookmark, isAuthenticated: isAuthForBookmark } = useBookmark();
  const [currentBookmark, setCurrentBookmark] = useState<any>(null);
  
  // Reading list hook
  const { 
    addToReadingList, 
    removeFromReadingList, 
    isInReadingList, 
    loading: readingListLoading 
  } = useReadingList();
  const [isInReadingListState, setIsInReadingListState] = useState(false);
  
  // Rating hook
  const { getMangaRatingStats, rateManga, deleteRating } = useRating();
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  
  // Data states
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [relatedManga, setRelatedManga] = useState<Manga[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User role hook
  const { userRole, isAdmin, isFansub } = useUserRole();
  
  // Current user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal states
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showEditMangaModal, setShowEditMangaModal] = useState(false);
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [showDeleteChapterModal, setShowDeleteChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const [showChapterMenu, setShowChapterMenu] = useState<string | null>(null);

  // Scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch manga data function
  const fetchMangaData = async () => {
      if (!slug) {
        console.error('❌ Slug is undefined!');
        setError('Manga slug bulunamadı');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch manga details
        const { data: mangaData, error: mangaError } = await supabase
          .from('mangas')
          .select('*')
          .eq('slug', slug)
          .single();

        if (mangaError) throw mangaError;
        if (!mangaData) {
          setError('Manga bulunamadı');
          return;
        }

        // Status'u enum'a cast et
        const castedManga = {
          ...mangaData,
          status: mangaData.status as 'ongoing' | 'completed' | 'hiatus' | null,
          categories: (mangaData.categories as string[]) || []
        } as Manga;
        setManga(castedManga);

        // Fetch categories for this manga
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('manga_categories')
          .select(`
            categories (
              id,
              name,
              slug,
              color
            )
          `)
          .eq('manga_id', mangaData.id);

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData?.map(item => item.categories) || []);

        // Fetch chapters for this manga
        // OPTIMIZATION: Limit to 100 chapters to prevent resource exhaustion
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('chapters')
          .select('*')
          .eq('manga_id', mangaData.id)
          .order('chapter_number', { ascending: false })
          .limit(100);

        if (chaptersError) throw chaptersError;
        setChapters(chaptersData || []);

        // Fetch related manga (same genre, excluding current)
        const { data: relatedData, error: relatedError } = await supabase
          .from('mangas')
          .select('*')
          .neq('id', mangaData.id)
          .limit(4);

        if (relatedError) throw relatedError;
        // Related manga'ların status'unu enum'a cast et
        const castedRelatedManga = (relatedData || []).map(manga => ({
          ...manga,
          status: manga.status as 'ongoing' | 'completed' | 'hiatus' | null,
          categories: (manga.categories as string[]) || []
        } as Manga));
        setRelatedManga(castedRelatedManga);

        // Fetch bookmark for this manga
        if (isAuthForBookmark && mangaData.id) {
          const bookmark = await getBookmark(mangaData.id);
          if (bookmark) {
            // Bookmark varsa chapter bilgisini al
            const { data: bookmarkChapter } = await supabase
              .from('chapters')
              .select('chapter_number')
              .eq('id', bookmark.chapter_id)
              .maybeSingle();
            
            setCurrentBookmark({
              ...bookmark,
              chapter_number: bookmarkChapter?.chapter_number,
            });
          }

          // Check if manga is in reading list
          const inReadingList = await isInReadingList(mangaData.id);
          setIsInReadingListState(inReadingList);
        }

      } catch (err: any) {
        console.error('Error fetching manga:', err);
        setError(err.message || 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    if (slug) {
      fetchMangaData();
    }
  }, [slug]);

  // Load rating stats (memoized to prevent infinite loops)
  const loadRatingStats = useCallback(async () => {
    if (!manga) return;
    
    setIsLoadingRating(true);
    try {
      const stats = await getMangaRatingStats(manga.id);
      setRatingStats(stats);
    } catch (error) {
      console.error('Error loading rating stats:', error);
    } finally {
      setIsLoadingRating(false);
    }
  }, [manga, getMangaRatingStats]);

  // Load rating stats when manga is loaded
  useEffect(() => {
    if (manga) {
      loadRatingStats();
    }
  }, [manga?.id, loadRatingStats]);

  // Handle rating change
  const handleRatingChange = async (newRating: number) => {
    // Immediately reload stats for accurate data (no timeout)
    await loadRatingStats();
  };

  // Fetch current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Refresh chapters when a new chapter is added
  const refreshChapters = async () => {
    if (!manga) return;
    
    try {
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', manga.id)
        .order('chapter_number', { ascending: false });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);
    } catch (error) {
      console.error('Bölümler yenilenirken hata:', error);
    }
  };

  // Update manga data when edited
  const handleMangaUpdate = (updatedManga: Manga) => {
    setManga(prevManga => prevManga ? { ...prevManga, ...updatedManga } : null);
    // Categories will be updated in the manga object
  };

  // Check if user can edit manga
  const canEditManga = () => {
    if (!manga || !userRole) return false;
    
    // Admin veya moderator her manga'yı düzenleyebilir
    if (userRole === 'admin' || userRole === 'moderator') return true;
    
    // Fansub sadece kendi oluşturduğu manga'ları düzenleyebilir
    if (userRole === 'fansub') {
      if (!currentUser) return false;
      
      // Kullanıcı kendi oluşturduğu manga'yı veya kendisine atanmış manga'yı düzenleyebilir
      return manga.creator_id === currentUser.id || manga.fansub_id === currentUser.id;
    }
    
    return false;
  };

  // Check if user can add chapters to this manga
  const canAddChapter = () => {
    if (!manga || !userRole) return false;
    
    // Admin veya moderator her manga'ya bölüm ekleyebilir
    if (userRole === 'admin' || userRole === 'moderator') return true;
    
    // Fansub sadece kendi manga'larına bölüm ekleyebilir
    if (userRole === 'fansub') {
      if (!currentUser) return false;
      
      // Kullanıcı kendi oluşturduğu manga'ya veya kendisine atanmış manga'ya bölüm ekleyebilir
      return manga.creator_id === currentUser.id || manga.fansub_id === currentUser.id;
    }
    
    return false;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background-pure-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Manga yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !manga) {
    return (
      <div className="min-h-screen bg-background-pure-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Manga bulunamadı'}</p>
          <Link to="/library">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold"
            >
              Kütüphaneye Dön
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-pure-dark">
      {/* Navbar Component */}
      <Navbar isScrolled={isScrolled} />

      {/* Hero Section with Cover */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-background-pure-dark" />

        <div className="relative z-20 container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Cover Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                <img
                  src={manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop'}
                  alt={manga.title}
                  className="relative w-full h-auto max-w-sm mx-auto rounded-2xl shadow-2xl border border-purple-500/20"
                />
              </div>
            </motion.div>

            {/* Manga Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2 flex flex-col justify-center"
            >
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <Link to="/" className="hover:text-purple-400 transition-colors">Ana Sayfa</Link>
                <ChevronRight className="h-4 w-4" />
                <Link to="/library" className="hover:text-purple-400 transition-colors">Kütüphane</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-slate-300">{manga.title}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {manga.title}
                </span>
              </h1>

              {/* Source Badge */}
              <div className="mb-6">
                <SourceBadge 
                  creatorId={manga.creator_id} 
                  approvalStatus={manga.approval_status || 'approved'}
                />
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {/* Rating Display */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg backdrop-blur-md" style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                  {isLoadingRating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                      <span className="text-white font-bold">Yükleniyor...</span>
                    </div>
                  ) : ratingStats ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-bold">{ratingStats.averageRating.toFixed(1)}</span>
                      <span className="text-slate-400 text-sm">({ratingStats.totalRatings} puan)</span>
                      {ratingStats.userRating && (
                        <span className="text-blue-400 text-sm ml-1">• Puanınız: {ratingStats.userRating}/10</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-bold">Puanlanmamış</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  <Eye className="h-5 w-5 text-blue-400" />
                  <span className="text-slate-300">{manga.view_count?.toLocaleString() || '0'} görüntülenme</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <BookOpen className="h-5 w-5 text-purple-400" />
                  <span className="text-slate-300">{chapters.length} bölüm</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-300 leading-relaxed mb-6">
                {manga.description}
              </p>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mb-6">
                  <p className="text-slate-500 text-sm mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Kategoriler
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category: any, index: number) => (
                      <motion.span
                        key={category.id || index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium text-white border"
                        style={{
                          backgroundColor: `${category.color}20`,
                          borderColor: category.color,
                          color: category.color
                        }}
                      >
                        {category.name}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-slate-500 text-sm mb-1">Durum</p>
                  <p className="text-slate-200 font-medium">
                    {manga.status === 'ongoing' ? 'Devam Ediyor' : manga.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">Tür</p>
                  <p className="text-slate-200 font-medium capitalize">Manga</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">Yazar</p>
                  <p className="text-slate-200 font-medium">{manga.author || 'Bilinmiyor'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">Çizim</p>
                  <p className="text-slate-200 font-medium">{manga.artist || manga.author || 'Bilinmiyor'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {chapters.length > 0 && !currentBookmark && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!user) {
                        toast.error('Mangaları okumak için üye olmanız gerekiyor!', {
                          duration: 3000,
                          icon: '🔒',
                          style: {
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: 'white',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          },
                        });
                        setTimeout(() => {
                          window.location.href = '/login';
                        }, 1500);
                        return;
                      }
                      window.location.href = `/read/${manga.slug}/${chapters[chapters.length - 1].chapter_number}`;
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/30"
                  >
                    <PlayCircle className="h-5 w-5" />
                    İlk Bölümü Oku
                  </motion.button>
                )}

                {/* Devam Et Butonu - Bookmark varsa göster */}
                {currentBookmark && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!user) {
                        toast.error('Mangaları okumak için üye olmanız gerekiyor!', {
                          duration: 3000,
                          icon: '🔒',
                          style: {
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: 'white',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          },
                        });
                        setTimeout(() => {
                          window.location.href = '/login';
                        }, 1500);
                        return;
                      }
                      window.location.href = `/read/${manga.slug}/${currentBookmark.chapter_number}?page=${currentBookmark.page_number}`;
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 group relative"
                    title={`Son okunan: Bölüm ${currentBookmark.chapter_number}, Sayfa ${currentBookmark.page_number}`}
                  >
                    <BookmarkCheck className="h-5 w-5" />
                    <div className="flex flex-col items-start">
                      <span>Devam Et</span>
                      <span className="text-xs text-emerald-100 opacity-90">
                        Bölüm {currentBookmark.chapter_number}, Sayfa {currentBookmark.page_number}
                      </span>
                    </div>
                  </motion.button>
                )}

                {/* İlk Bölümü Oku - Bookmark varsa ikinci sırada göster */}
                {chapters.length > 0 && currentBookmark && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!user) {
                        toast.error('Mangaları okumak için üye olmanız gerekiyor!', {
                          duration: 3000,
                          icon: '🔒',
                          style: {
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: 'white',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          },
                        });
                        setTimeout(() => {
                          window.location.href = '/login';
                        }, 1500);
                        return;
                      }
                      window.location.href = `/read/${manga.slug}/${chapters[chapters.length - 1].chapter_number}`;
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md bg-white/5 border border-purple-500/30 text-slate-300 hover:bg-purple-500/10 transition-colors"
                  >
                    <PlayCircle className="h-5 w-5" />
                    İlk Bölümü Oku
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    if (!manga) return;
                    await toggleFavorite(manga.id);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md border transition-colors ${
                    isFavorite(manga?.id || '')
                      ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-pink-500/30'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorite(manga?.id || '') ? 'fill-pink-400' : ''}`} />
                  {isFavorite(manga?.id || '') ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                </motion.button>

                {/* Rating Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!user) {
                      toast.error('Puanlama yapabilmek için giriş yapmalısınız');
                      return;
                    }
                    setShowRatingModal(true);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md border transition-colors ${
                    ratingStats?.userRating
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-yellow-500/30'
                  }`}
                >
                  <Star className={`h-5 w-5 ${ratingStats?.userRating ? 'fill-yellow-400' : ''}`} />
                  {ratingStats?.userRating ? `Puanınız: ${ratingStats.userRating}/10` : 'Puanla'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    if (!manga) return;
                    
                    if (isInReadingListState) {
                      // Manga'yı okuma listesinden kaldır
                      await removeFromReadingList(manga.id);
                      setIsInReadingListState(false);
                    } else {
                      // Manga'yı okuma listesine ekle
                      await addToReadingList({
                        manga_id: manga.id,
                        manga_title: manga.title,
                        manga_slug: manga.slug,
                        manga_cover_url: manga.cover_image_url,
                      });
                      setIsInReadingListState(true);
                    }
                  }}
                  disabled={readingListLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md border transition-colors ${
                    isInReadingListState
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-green-500/30'
                  } ${readingListLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <BookOpen className={`h-5 w-5 ${isInReadingListState ? 'fill-green-400' : ''}`} />
                  {isInReadingListState ? 'Listeden Çıkar' : 'Listeye Ekle'}
                </motion.button>

                {/* Takip Et Butonu */}
                {manga && <FollowButton mangaId={manga.id} />}

                {/* Bölüm Ekle Butonu - Admin/Moderator/Owner's Fansub için */}
                {canAddChapter() && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddChapterModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md bg-gradient-to-r from-blue-600 to-cyan-600 border border-blue-500/50 text-white hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/30"
                  >
                    <Plus className="h-5 w-5" />
                    Bölüm Ekle
                  </motion.button>
                )}

                {/* Manga Düzenle Butonu - Admin/Moderator için */}
                {canEditManga() && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEditMangaModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/50 text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30"
                  >
                    <Edit3 className="h-5 w-5" />
                    Manga Düzenle
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 text-slate-300 hover:border-purple-500/30 transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  Paylaş
                </motion.button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Chapters List */}
      <section className="relative py-16 border-t border-purple-500/20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-8">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Bölümler
              </span>
            </h2>

            {chapters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Henüz bölüm eklenmemiş.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chapters && chapters.length > 0 && chapters.slice(0, 12).map((chapter, idx) => (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-xl backdrop-blur-md overflow-hidden group"
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                      }}
                    >
                      <motion.button
                        onClick={() => {
                          if (!user) {
                            toast.error('Mangaları okumak için üye olmanız gerekiyor!', {
                              duration: 3000,
                              icon: '🔒',
                              style: {
                                background: 'rgba(15, 23, 42, 0.9)',
                                color: 'white',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                              },
                            });
                            setTimeout(() => {
                              window.location.href = '/login';
                            }, 1500);
                            return;
                          }
                          window.location.href = `/read/${manga.slug}/${chapter.chapter_number}`;
                        }}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                            Bölüm {chapter.chapter_number}
                          </h3>
                          <PlayCircle className="h-5 w-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {chapter.title && (
                          <p className="text-slate-400 text-sm mb-2 line-clamp-1">{chapter.title}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(chapter.created_at).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </motion.button>

                      {/* Edit/Delete buttons for authorized users */}
                      {canEditManga() && (
                        <div className="absolute top-2 right-2 z-10">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowChapterMenu(showChapterMenu === chapter.id ? null : chapter.id);
                            }}
                            className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </motion.button>

                          <AnimatePresence>
                            {showChapterMenu === chapter.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-full right-0 mt-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 min-w-[120px] overflow-hidden"
                              >
                                <motion.button
                                  whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingChapter(chapter);
                                    setShowEditChapterModal(true);
                                    setShowChapterMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-white hover:text-purple-400 transition-colors flex items-center gap-2"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Düzenle
                                </motion.button>
                                <motion.button
                                  whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeletingChapter(chapter);
                                    setShowDeleteChapterModal(true);
                                    setShowChapterMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-left text-white hover:text-red-400 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Sil
                                </motion.button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {chapters.length > 12 && (
                  <div className="text-center mt-8">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 rounded-xl backdrop-blur-md bg-white/5 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-colors"
                    >
                      Tüm Bölümleri Göster ({chapters.length})
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Related Manga */}
      {relatedManga.length > 0 && (
        <section className="relative py-16 border-t border-purple-500/20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold mb-8">
                <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  İlgini Çekebilir
                </span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedManga && relatedManga.length > 0 && relatedManga.map((item, idx) => (
                  <Link key={item.id} to={`/manga/${item.slug}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      whileHover={{ y: -8 }}
                      className="group cursor-pointer"
                    >
                      <div className="relative overflow-hidden rounded-xl mb-3">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <img
                          src={item.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop'}
                          alt={item.title}
                          className="w-full h-72 object-cover transform group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span>{item.rating_average?.toFixed(1) || 'N/A'}</span>
                            <Eye className="h-4 w-4 ml-2" />
                            <span>{item.view_count?.toLocaleString() || '0'}</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-slate-400 text-sm">Manga</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Yorumlar Bölümü */}
      {manga && (
        <section className="relative py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <CommentList mangaId={manga.id} />
            </motion.div>
          </div>
        </section>
      )}

      {/* Bölüm Ekleme Modalı */}
      {manga && (
        <AddChapterModal
          isOpen={showAddChapterModal}
          onClose={() => setShowAddChapterModal(false)}
          manga={{ id: manga.id, title: manga.title }}
          onChapterAdded={refreshChapters}
        />
      )}

      {/* Manga Düzenleme Modalı */}
      {manga && (
        <EditMangaModal
          manga={{
            ...manga,
            categories: categories
          }}
          isOpen={showEditMangaModal}
          onClose={() => setShowEditMangaModal(false)}
          onUpdate={handleMangaUpdate}
        />
      )}

      {/* Bölüm Düzenleme Modalı */}
      <EditChapterModal
        isOpen={showEditChapterModal}
        onClose={() => {
          setShowEditChapterModal(false);
          setEditingChapter(null);
        }}
        chapter={editingChapter}
        onUpdate={(updatedChapter) => {
          // Update chapters list
          setChapters(prev => prev.map(ch => ch.id === updatedChapter.id ? updatedChapter : ch));
          setEditingChapter(null);
        }}
      />

      {/* Bölüm Silme Modalı */}
      <DeleteChapterModal
        isOpen={showDeleteChapterModal}
        onClose={() => {
          setShowDeleteChapterModal(false);
          setDeletingChapter(null);
        }}
        chapter={deletingChapter}
        onDelete={(chapterId) => {
          // Remove chapter from list
          setChapters(prev => prev.filter(ch => ch.id !== chapterId));
          setDeletingChapter(null);
        }}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        mangaId={manga?.id || ''}
        mangaTitle={manga?.title || ''}
        mangaCover={manga?.cover_image_url}
        currentRating={ratingStats?.userRating || 0}
        onRatingChange={handleRatingChange}
      />

    </div>
  );
}
