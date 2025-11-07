import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Tag, ArrowLeft, Home, ChevronRight, Sparkles, Star, Eye, Heart } from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import { supabase, type Manga } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';

// Same categories as LibraryPage
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

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [categoryManga, setCategoryManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryNotFound, setCategoryNotFound] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Find category name from slug
  const findCategoryFromSlug = (slug: string) => {
    return allCategories.find((cat) => {
      const catSlug = cat
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      return catSlug === slug;
    });
  };

  const categoryName = categorySlug ? findCategoryFromSlug(categorySlug) : undefined;

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch category manga
  useEffect(() => {
    const fetchCategoryManga = async () => {
      if (!categoryName) {
        setCategoryNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setCategoryNotFound(false);
        
        // Fetch all approved manga
        const { data, error } = await supabase
          .from('mangas')
          .select('*')
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Filter by category (categories is a JSON array)
        const filtered = (data || []).filter((manga) => {
          const categories = (manga.categories as string[]) || [];
          return categories.includes(categoryName);
        });
        
        // Transform data
        const transformManga = (manga: any) => {
          return {
            id: manga.id,
            slug: manga.slug,
            title: manga.title,
            cover: manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
            rating: manga.rating_average,
            views: `${(manga.view_count / 1000000).toFixed(1)}M`,
            genre: categoryName,
            chapters: manga.total_chapters,
          };
        };
        
        setCategoryManga(filtered.map(transformManga));
      } catch (error) {
        console.error('Error fetching category manga:', error);
        setCategoryManga([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryManga();
  }, [categoryName]);

  // If category not found
  if (categoryNotFound) {
    return (
      <div className="min-h-screen bg-background-pure-dark">
        <Navbar isScrolled={isScrolled} />
        
        <section className="relative pt-32 pb-16 overflow-hidden min-h-screen flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <ParticleSystem />
          </div>
          
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-background-pure-dark" />

          <div className="relative z-20 container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div 
                className="p-12 rounded-2xl backdrop-blur-md"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                <Tag className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Kategori Bulunamadı</h2>
                <p className="text-slate-400 mb-6">Aradığınız kategori mevcut değil.</p>
                
                <Link to="/categories">
                  <motion.button
                    className="px-6 py-3 rounded-full text-white font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Kategorilere Dön
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-pure-dark">
      
      {/* Navbar */}
      <Navbar isScrolled={isScrolled} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-background-pure-dark" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-sm text-slate-400 mb-8"
          >
            <Link to="/" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/categories" className="hover:text-purple-400 transition-colors">
              Kategoriler
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{categoryName}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            {/* Icon Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md mb-6"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <Tag className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Kategori</span>
            </motion.div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                {categoryName}
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {categoryManga.length > 0 
                ? `${categoryManga.length} manga bulundu` 
                : 'Bu kategoride henüz manga bulunmuyor'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Manga Grid Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background-pure-dark via-slate-900/95 to-background-pure-dark" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            </div>
          ) : categoryManga.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categoryManga.map((manga, idx) => (
                <MangaCard 
                  key={manga.id} 
                  manga={manga} 
                  index={idx}
                  isFavorite={isFavorite(manga.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto"
              >
                <div 
                  className="p-12 rounded-2xl backdrop-blur-md"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">Bu kategoride henüz manga bulunmuyor</p>
                  <p className="text-slate-500 text-sm">Yakında yeni seriler eklenecek!</p>
                  
                  <div className="mt-6 flex gap-3 justify-center">
                    <Link to="/categories">
                      <motion.button
                        className="px-6 py-3 rounded-full text-white font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Diğer Kategoriler
                      </motion.button>
                    </Link>
                    
                    <Link to="/library">
                      <motion.button
                        className="px-6 py-3 rounded-full backdrop-blur-md"
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#fff',
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          borderColor: 'rgba(139, 92, 246, 0.5)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Tüm Manga'lar
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Manga Card Component (same as HomePage & RandomPage)
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
  isFavorite: boolean;
  onToggleFavorite: (mangaId: string) => Promise<any>;
}

function MangaCard({ manga, index, isFavorite, onToggleFavorite }: MangaCardProps) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
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
          {/* Cover Image */}
          <div className="relative aspect-[3/4] overflow-hidden flex-shrink-0">
            <motion.img
              src={manga.cover}
              alt={manga.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
            
            {/* Favorite Button */}
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
            >
              <Heart 
                className={`h-5 w-5 transition-colors ${
                  isFavorite 
                    ? 'text-pink-400 fill-pink-400' 
                    : 'text-purple-400'
                }`}
              />
            </motion.button>

            {/* Genre Badge */}
            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-md text-xs font-medium"
              style={{
                background: 'rgba(139, 92, 246, 0.3)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#C4B5FD',
              }}
            >
              {manga.genre}
            </div>

            {/* Stats Overlay */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95), transparent)',
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-4 w-4 fill-yellow-400" />
                  <span className="font-semibold">{manga.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <Eye className="h-4 w-4" />
                  <span>{manga.views}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Card Info */}
          <div className="p-4 flex-shrink-0 h-[100px] flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 overflow-hidden group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
              {manga.title}
            </h3>
            
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{manga.chapters} Bölüm</span>
              <motion.div
                className="flex items-center gap-1"
                whileHover={{ x: 5 }}
              >
                <span className="text-purple-400 font-medium">Oku</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </div>
          </div>

          {/* Glow Effect */}
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
