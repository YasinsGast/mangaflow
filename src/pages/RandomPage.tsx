import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Shuffle, RefreshCw, Sparkles, Star, Eye, Heart } from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import { supabase, type Manga } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';

export default function RandomPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [randomManga, setRandomManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch random manga
  const fetchRandomManga = async () => {
    try {
      setLoading(true);
      
      // Fetch approved manga with random order
      const { data, error } = await supabase
        .from('mangas')
        .select('*')
        .eq('approval_status', 'approved')
        .limit(1000); // Get many to randomize client-side
      
      if (error) throw error;
      
      // Shuffle and take first 12
      const shuffled = (data || [])
        .sort(() => Math.random() - 0.5)
        .slice(0, 12);
      
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
          chapters: manga.total_chapters,
        };
      };
      
      setRandomManga(shuffled.map(transformManga));
    } catch (error) {
      console.error('Error fetching random manga:', error);
      setRandomManga([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRandomManga();
  }, []);

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
              <Shuffle className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Rastgele Keşfet</span>
            </motion.div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Rastgele Manga
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Yeni seriler keşfet! Her tıklamada seni farklı bir dünyaya götürecek rastgele manga'lar.
            </p>

            {/* Refresh Button */}
            <motion.button
              onClick={fetchRandomManga}
              disabled={loading}
              className="px-8 py-4 rounded-full text-white font-semibold relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
              }}
              whileHover={{ 
                scale: loading ? 1 : 1.05,
                boxShadow: '0 15px 50px rgba(139, 92, 246, 0.5)',
              }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Yükleniyor...' : 'Yeni Rastgele'}
              </span>
            </motion.button>
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
          ) : randomManga.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {randomManga.map((manga, idx) => (
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
                  <p className="text-slate-400 text-lg mb-2">Henüz onaylanmış manga bulunmuyor</p>
                  <p className="text-slate-500 text-sm">Yakında yeni seriler eklenecek!</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Manga Card Component (same as HomePage)
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
