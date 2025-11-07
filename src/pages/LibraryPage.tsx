import { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Search, 
  SlidersHorizontal, 
  Grid3x3, 
  LayoutGrid, 
  List, 
  ChevronDown,
  X,
  Sparkles,
  Star,
  Eye,
  Bookmark,
  Filter,
  Heart
} from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import { supabase, type Manga } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LibraryPage() {
  const { user } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
  
  // Navbar state
  const [isScrolled, setIsScrolled] = useState(false);

  // Favorites hook
  const { isFavorite, toggleFavorite } = useFavorites();

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid-6' | 'grid-4' | 'grid-3' | 'list'>('grid-6');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Data state
  const [allManga, setAllManga] = useState<any[]>([]);
  const [followingManga, setFollowingManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch manga data from Supabase with server-side filtering and pagination
  const fetchMangaData = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setAllManga([]);
      } else {
        setLoadingMore(true);
      }
      
      const limit = 24;
      const offset = reset ? 0 : allManga.length;
      
      // Build query with server-side filtering
      let query = supabase
        .from('mangas')
        .select('*', { count: 'exact' });
      
      // Server-side search filter
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      
      // Server-side status filter
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      
      // Server-side sorting
      switch (sortBy) {
        case 'popular':
        case 'rating':
          query = query.order('rating_average', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'views':
          query = query.order('view_count', { ascending: false });
          break;
        case 'az':
          query = query.order('title', { ascending: true });
          break;
        case 'za':
          query = query.order('title', { ascending: false });
          break;
        case 'latest-chapter':
          query = query.order('updated_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      // Pagination
      query = query.range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform data to match component props
      const transformManga = (manga: any) => {
        return {
          id: manga.id,
          slug: manga.slug,
          title: manga.title,
          cover: manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
          rating: manga.rating_average,
          views: `${(manga.view_count / 1000000).toFixed(1)}M`,
          genre: 'Aksiyon',
          categories: ['Aksiyon'],
          chapters: manga.total_chapters,
          status: manga.status,
          type: 'manhwa',
        };
      };
      
      const transformed = data?.map(transformManga) || [];
      
      if (reset) {
        setAllManga(transformed);
      } else {
        setAllManga(prev => [...prev, ...transformed]);
      }
      
      setTotalCount(count || 0);
      setHasMore(transformed.length === limit);
    } catch (error) {
      console.error('Error fetching manga data:', error);
      if (reset) setAllManga([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Initial load and filter changes
  useEffect(() => {
    fetchMangaData(true);
  }, [searchQuery, selectedStatus, sortBy]);

  // Fetch following manga when user is logged in and tab is active
  useEffect(() => {
    const fetchFollowingManga = async () => {
      if (!user || activeTab !== 'following') {
        setFollowingManga([]);
        return;
      }

      try {
        setFollowingLoading(true);

        // Fetch user's follows
        const { data: follows, error: followError } = await supabase
          .from('user_manga_follows')
          .select('manga_id')
          .eq('user_id', user.id);

        if (followError) throw followError;

        if (!follows || follows.length === 0) {
          setFollowingManga([]);
          return;
        }

        // Get manga IDs
        const mangaIds = follows.map(f => f.manga_id);

        // Fetch manga data
        const { data: mangaData, error: mangaError } = await supabase
          .from('mangas')
          .select('*')
          .in('id', mangaIds)
          .order('created_at', { ascending: false });

        if (mangaError) throw mangaError;

        // Transform data
        const transformManga = (manga: any) => {
          return {
            id: manga.id,
            slug: manga.slug,
            title: manga.title,
            cover: manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
            rating: manga.rating_average,
            views: `${(manga.view_count / 1000000).toFixed(1)}M`,
            genre: 'Aksiyon',
            categories: ['Aksiyon'],
            chapters: manga.total_chapters,
            status: manga.status,
            type: 'manhwa',
          };
        };

        setFollowingManga(mangaData?.map(transformManga) || []);
      } catch (error) {
        console.error('Error fetching following manga:', error);
        setFollowingManga([]);
        toast.error('Takip listesi yüklenirken hata oluştu');
      } finally {
        setFollowingLoading(false);
      }
    };

    fetchFollowingManga();
  }, [user, activeTab]);

  // Scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // All available categories (100+ örnek)
  const allCategories = [
    'Aksiyon', 'Macera', 'Romantik', 'Komedi', 'Drama', 'Fantezi', 'Bilim Kurgu',
    'Korku', 'Gizem', 'Gerilim', 'Psikolojik', 'Supernatural', 'Doğaüstü',
    'Okul Hayatı', 'Slice of Life', 'Spor', 'Müzik', 'Sanat', 'Tarih',
    'Askeri', 'Polisiye', 'Suç', 'Dedektif', 'Isekai', 'Reenkarnasyon',
    'Oyun', 'Sanal Gerçeklik', 'Mecha', 'Uzay', 'Zaman Yolculuğu',
    'Vampir', 'Cadı', 'Ninja', 'Samuray', 'Dövüş Sanatları', 'Silah Ustası',
    'Büyücü', 'Büyü', 'Ejderha', 'Demon', 'Melek', 'Tanrı', 'Ölümsüz',
    'Kült', 'Apokaliptik', 'Distopya', 'Post-Apokaliptik', 'Zombie',
    'Hayatta Kalma', 'Avcı', 'Kule', 'Zindan', 'Leveling', 'Sistemli',
    'Regresyon', 'Dönüş', 'İntikam', 'Güçlü MC', 'Zayıftan Güçlüye',
    'OP MC', 'Harem', 'Reverse Harem', 'Yaoi', 'Yuri', 'Shounen',
    'Shoujo', 'Seinen', 'Josei', 'Ecchi', 'Mature', 'Yetişkin',
    'Aile', 'Çocuklar', 'Eğitim', 'İş Dünyası', 'Ekonomi', 'Politika',
    'Krallık İnşası', 'Strateji', 'Savaş', 'Lider', 'İmparator', 'Kral',
    'Prens', 'Prenses', 'Şövalye', 'Sihirli Akademi', 'Okul', 'Öğretmen',
    'Doktor', 'Cerrah', 'Şifacı', 'Simyacı', 'Aşçı', 'Yemek', 'Mutfak',
    'Sanatçı', 'Ressam', 'Müzisyen', 'İdol', 'Aktör', 'Ünlü', 'Medya',
    'Yayıncı', 'Streamer', 'Gamer', 'E-Spor', 'MMORPG', 'VRMMORPG',
    'Hayvanlar', 'Evcil Hayvan', 'Canavar', 'Beast Tamer', 'Necromancer',
    'Büyü Dehası', 'Pedestal', 'Murim', 'Wuxia', 'Xianxia', 'Xuanhuan',
  ];

  // Sort options
  const sortOptions = [
    { value: 'popular', label: 'En Popüler' },
    { value: 'newest', label: 'Yeni Eklenenler' },
    { value: 'rating', label: 'En Yüksek Puan' },
    { value: 'views', label: 'En Çok Görüntülenen' },
    { value: 'az', label: 'A-Z' },
    { value: 'za', label: 'Z-A' },
    { value: 'latest-chapter', label: 'En Yeni Bölüm' },
  ];

  // Filter categories based on search
  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Remove category
  const removeCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };

  // Display manga based on active tab (NO CLIENT-SIDE FILTERING - done server-side)
  const displayManga = activeTab === 'following' ? followingManga : allManga;
  const displayLoading = activeTab === 'following' ? followingLoading : loading;

  // Grid class based on view mode
  const getGridClass = () => {
    switch (viewMode) {
      case 'grid-6':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
      case 'grid-4':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      case 'grid-3':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 'list':
        return 'grid-cols-1';
      default:
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
    }
  };

  return (
    <div className="min-h-screen bg-background-pure-dark">
      {/* Navbar Component */}
      <Navbar isScrolled={isScrolled} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden border-b border-purple-500/20">
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-background-pure-dark" />

        <div className="relative z-20 container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md mb-4"
              style={{
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}
            >
              <Book className="h-5 w-5 text-pink-400" />
              <span className="text-sm font-medium text-pink-300">Kütüphane</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Manga & Webtoon Koleksiyonu
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {totalCount > 0 ? totalCount : allManga.length} seri arasından favorilerinizi keşfedin
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tab Navigation */}
      {user && (
        <section className="relative py-4 border-b border-purple-500/10 z-30">
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/50 to-background-pure-dark" />
          
          <div className="relative z-10 container mx-auto px-6">
            <div className="flex gap-4 justify-center">
              <motion.button
                onClick={() => setActiveTab('all')}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-300
                  ${activeTab === 'all'
                    ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-blue-300 border-2 border-blue-500/50'
                    : 'bg-white/5 text-slate-400 border-2 border-white/10 hover:border-purple-500/30'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tümü
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('following')}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-300
                  ${activeTab === 'following'
                    ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-300 border-2 border-emerald-500/50'
                    : 'bg-white/5 text-slate-400 border-2 border-white/10 hover:border-emerald-500/30'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Takip Ettiklerim
              </motion.button>
            </div>
          </div>
        </section>
      )}

      {/* Filters Section */}
      <section className="relative py-8 border-b border-purple-500/10 z-30">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background-pure-dark to-slate-900/50" />
        
        <div className="relative z-10 container mx-auto px-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Manga veya webtoon ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl backdrop-blur-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              />
            </motion.div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              {/* Category Dropdown */}
              <div className="relative flex-1 min-w-[250px] z-50">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-md flex items-center justify-between gap-2 text-white hover:border-purple-500/50 transition-all"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-400" />
                    <span className="text-sm">
                      Kategoriler {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showCategoryDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full max-h-96 overflow-hidden rounded-xl backdrop-blur-xl z-[9999]"
                      style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      {/* Category Search */}
                      <div className="p-3 border-b border-purple-500/20">
                        <input
                          type="text"
                          placeholder="Kategori ara..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800/50 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                      </div>

                      {/* Category List */}
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {filteredCategories.map((category) => (
                          <button
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
                              selectedCategories.includes(category)
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'hover:bg-slate-800/50 text-slate-300'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-3 rounded-xl backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <option value="all" className="bg-slate-900">Tüm Durumlar</option>
                <option value="ongoing" className="bg-slate-900">Devam Ediyor</option>
                <option value="completed" className="bg-slate-900">Tamamlandı</option>
                <option value="hiatus" className="bg-slate-900">Ara Verdi</option>
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 rounded-xl backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <option value="all" className="bg-slate-900">Tüm Türler</option>
                <option value="manga" className="bg-slate-900">Manga</option>
                <option value="manhwa" className="bg-slate-900">Manhwa</option>
                <option value="manhua" className="bg-slate-900">Manhua</option>
                <option value="webtoon" className="bg-slate-900">Webtoon</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-2 px-2 py-2 rounded-xl backdrop-blur-md"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <button
                  onClick={() => setViewMode('grid-6')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid-6'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid 6 Kolon"
                >
                  <Grid3x3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid-4')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid-4'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid 4 Kolon"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid-3')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid-3'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid 3 Kolon"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Liste Görünümü"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Selected Categories Tags */}
            {selectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {selectedCategories.map((category) => (
                  <motion.button
                    key={category}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => removeCategory(category)}
                    className="px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-sm text-purple-300 hover:bg-purple-500/30 transition-all"
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {category}
                    <X className="h-3 w-3" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Manga Grid */}
      <section className="relative py-12">
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/50 via-slate-900/95 to-background-pure-dark" />

        <div className="relative z-20 container mx-auto px-6">
          {displayLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            </div>
          ) : displayManga.length > 0 ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${currentPage}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className={`grid ${getGridClass()} gap-6`}
                >
                  {displayManga.map((manga, idx) => (
                    <MangaCard 
                      key={manga.id} 
                      manga={manga} 
                      index={idx} 
                      viewMode={viewMode}
                      isFavorite={isFavorite(manga.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Load More Button - Infinite Scroll */}
              {activeTab === 'all' && hasMore && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center gap-4 mt-12"
                >
                  <motion.button
                    onClick={() => fetchMangaData(false)}
                    disabled={loadingMore}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 rounded-xl backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-all flex items-center gap-3"
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-white font-medium">Yukleniyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <span className="text-white font-medium">Daha Fazla Yukle</span>
                      </>
                    )}
                  </motion.button>
                  {totalCount > 0 && (
                    <p className="text-slate-400 text-sm">
                      {allManga.length} / {totalCount} manga gösteriliyor
                    </p>
                  )}
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              {activeTab === 'following' ? (
                <div>
                  <p className="text-slate-400 text-lg mb-4">
                    Henüz hiçbir manga takip etmiyorsunuz
                  </p>
                  <p className="text-slate-500 text-sm">
                    Manga detay sayfalarında "Takip Et" butonuna tıklayarak takip listesine ekleyebilirsiniz
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-lg">Manga bulunamadı. Filtreleri değiştirin.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Manga Card Component
interface MangaCardProps {
  manga: {
    id: string;
    slug: string;
    title: string;
    cover: string;
    rating: number;
    views: string;
    genre: string;
    chapters: number;
  };
  index: number;
  viewMode: 'grid-6' | 'grid-4' | 'grid-3' | 'list';
  isFavorite: boolean;
  onToggleFavorite: (mangaId: string) => Promise<any>;
}

function MangaCard({ manga, index, viewMode, isFavorite, onToggleFavorite }: MangaCardProps) {
  const { user } = useAuth();
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle read button click
  const handleReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Show toast notification for non-authenticated users
      toast.error('Mangaları okumak için üye olmanız gerekiyor!', {
        duration: 3000,
        icon: '🔒',
        style: {
          background: 'rgba(15, 23, 42, 0.9)',
          color: 'white',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        },
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return;
    }
    
    // Navigate to manga detail page
    window.location.href = `/manga/${manga.slug}`;
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onToggleFavorite(manga.id);
    } catch (error) {
      console.error('Favori işlemi başarısız:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (viewMode === 'list') {
    // List view layout
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, x: -50 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
      >
        <Link to={`/manga/${manga.slug}`}>
          <motion.div
            className="group flex gap-6 p-4 rounded-2xl overflow-hidden cursor-pointer"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
            whileHover={{
              scale: 1.01,
              borderColor: 'rgba(139, 92, 246, 0.5)',
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-32 aspect-[3/4] overflow-hidden rounded-xl flex-shrink-0">
              <img
                src={manga.cover}
                alt={manga.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 px-2 py-1 rounded-md backdrop-blur-md text-xs font-semibold"
                style={{
                  background: 'rgba(236, 72, 153, 0.9)',
                  color: 'white',
                }}
              >
                {manga.genre}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                  {manga.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span>{manga.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{manga.views}</span>
                  </div>
                  <div>
                    <span>{manga.chapters} Bölüm</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <motion.button
                  className="px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2"
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(139, 92, 246, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bookmark className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-300 text-sm">Kaydet</span>
                </motion.button>

                <motion.button
                  onClick={handleReadClick}
                  className="flex items-center gap-1 text-purple-400 font-medium hover:text-purple-300 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <span>Oku</span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    );
  }

  // Grid view layout (same as HomePage)
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="h-full"
    >
      <Link to={`/manga/${manga.slug}`} className="h-full block">
        <motion.div
          className="group relative rounded-2xl overflow-hidden cursor-pointer h-full flex flex-col"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
          whileHover={{
            scale: 1.03,
            borderColor: 'rgba(139, 92, 246, 0.5)',
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative aspect-[3/4] overflow-hidden flex-shrink-0">
            <motion.img
              src={manga.cover}
              alt={manga.title}
              loading="lazy"
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

            {/* Favorite (Heart) Button */}
            <motion.button
              onClick={handleFavoriteClick}
              disabled={isProcessing}
              className="absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md z-10"
              style={{
                background: isFavorite 
                  ? 'rgba(236, 72, 153, 0.3)' 
                  : 'rgba(15, 23, 42, 0.8)',
                border: isFavorite 
                  ? '1px solid rgba(236, 72, 153, 0.5)' 
                  : '1px solid rgba(139, 92, 246, 0.3)',
              }}
              whileHover={{ 
                scale: 1.1, 
                backgroundColor: isFavorite 
                  ? 'rgba(236, 72, 153, 0.4)' 
                  : 'rgba(139, 92, 246, 0.3)' 
              }}
              whileTap={{ scale: 0.9 }}
              aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              <Heart 
                className={`h-5 w-5 transition-colors ${
                  isFavorite 
                    ? 'text-pink-400 fill-pink-400' 
                    : 'text-purple-400'
                }`}
              />
            </motion.button>

            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-md text-xs font-semibold"
              style={{
                background: 'rgba(236, 72, 153, 0.8)',
                border: '1px solid rgba(236, 72, 153, 0.5)',
                color: 'white',
              }}
            >
              {manga.genre}
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{manga.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{manga.views}</span>
              </div>
            </div>
          </div>

          <div className="p-4 h-[100px] flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white line-clamp-2 overflow-hidden">
              {manga.title}
            </h3>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{manga.chapters} Bölüm</span>
              <motion.button
                onClick={handleReadClick}
                className="flex items-center gap-1 hover:text-purple-300 transition-colors"
                whileHover={{ x: 5 }}
              >
                <span className="text-purple-400 font-medium">Oku</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
            </div>
          </div>

          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)',
            }}
            whileHover={{
              boxShadow: '0 0 30px 5px rgba(139, 92, 246, 0.3)',
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}
