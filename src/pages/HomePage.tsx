import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useInView } from 'framer-motion';
import { Book, Sparkles, Zap, Star, Eye, TrendingUp, Bookmark, Heart, Mail, ChevronRight, Github, MessageCircle } from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import { supabase, type Manga } from '@/lib/supabase';
import { useFavorites } from '@/hooks/useFavorites';

export default function HomePage() {
  const heroRef = useRef(null);
  const [scrollYProgress, setScrollYProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  // Favorites hook
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Manga data states
  const [popularManga, setPopularManga] = useState<any[]>([]);
  const [latestManga, setLatestManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch manga data from Supabase
  useEffect(() => {
    const fetchMangaData = async () => {
      try {
        setLoading(true);
        
        // Fetch all manga ordered by rating (for popular section)
        const { data: popularData, error: popularError } = await supabase
          .from('mangas')
          .select('*')
          .order('rating_average', { ascending: false })
          .limit(6);
        
        if (popularError) throw popularError;
        
        // Fetch latest chapters with their manga info (for latest section)
        // OPTIMIZATION: Reduced from 24 to 12 to prevent resource exhaustion
        const { data: latestData, error: latestError } = await supabase
          .from('chapters')
          .select(`
            id,
            chapter_number,
            title,
            created_at,
            approval_status,
            page_count,
            manga_id,
            manga:manga_id (
              id,
              title,
              slug,
              cover_image_url,
              rating_average,
              view_count
            )
          `)
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(12);
        
        if (latestError) throw latestError;
        
        // Transform data to match component props
        const transformManga = (manga: any) => {
          return {
            id: manga.id,
            slug: manga.slug,
            title: manga.title,
            cover: manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
            rating: manga.rating_average,
            views: `${(manga.view_count / 1000000).toFixed(1)}M`,
            genre: 'Aksiyon', // Default genre - you can add this to DB later
            chapters: manga.total_chapters,
          };
        };

        // Transform chapters data to manga format for latest section
        const transformLatestChapter = (chapter: any) => {
          if (!chapter.manga) {
            return null; // Skip chapters without manga info
          }
          
          return {
            id: chapter.manga.id,
            slug: chapter.manga.slug,
            title: `${chapter.manga.title} - Bölüm ${chapter.chapter_number}`,
            cover: chapter.manga.cover_image_url || 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
            rating: chapter.manga.rating_average || 0,
            views: `${((chapter.manga.view_count || 0) / 1000000).toFixed(1)}M`,
            genre: 'Aksiyon',
            chapters: chapter.manga.total_chapters || 0, // Manga'nın toplam bölüm sayısını göster
          };
        };
        
        setPopularManga(popularData?.map(transformManga) || []);
        setLatestManga(latestData?.map(transformLatestChapter).filter(Boolean) || []);
      } catch (error) {
        console.error('Error fetching manga data:', error);
        // Set empty arrays on error
        setPopularManga([]);
        setLatestManga([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMangaData();
  }, []);

  // Simplified scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollPosition / maxScroll;
      
      setScrollYProgress(progress);
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background-pure-dark">
      
      {/* Navbar Component */}
      <Navbar isScrolled={isScrolled} />

      {/* Enhanced 3D Interactive Hero Section with Magical Forest Background */}
      <section 
        ref={heroRef} 
        className="relative h-screen overflow-hidden"
        role="banner"
        aria-label="Hero section"
        style={{ perspective: '1000px' }}
      >
        {/* Background Image - Magical Forest */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{
            y: -scrollYProgress * 30,
            backgroundImage: 'url(/magical-forest-hero.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* Particle System Layer - Above background */}
        <div className="absolute inset-0 z-10">
          <ParticleSystem />
        </div>
        
        {/* Dark gradient overlay for text readability */}
        <motion.div 
          className="absolute inset-0 z-20"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(11, 15, 25, 0.5) 0%, 
                rgba(15, 23, 42, 0.45) 30%, 
                rgba(17, 24, 39, 0.5) 70%, 
                rgba(11, 15, 25, 0.65) 100%
              )
            `,
          }}
        />

        {/* Hero Content - Animated Text */}
        <div className="relative z-30 h-full flex items-center justify-center">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            {/* Main Title with Staggered Animation */}
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
              style={{ color: '#F8FAFC' }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.6, -0.05, 0.01, 0.99],
                delay: 0.2
              }}
            >
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Manga ve Webtoon
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Okuma Deneyimi
              </motion.span>
            </motion.h1>

            {/* Subtitle with Fade In */}
            <motion.p
              className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: '#CBD5E1' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.7, 
                ease: "easeOut",
                delay: 0.8
              }}
            >
              Binlerce manga ve webtoon'a anında erişim. Premium okuma deneyimi,
              kişiselleştirilmiş öneriler.
            </motion.p>

            {/* CTA Button with Scale Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                ease: [0.6, -0.05, 0.01, 0.99],
                delay: 1.0
              }}
            >
              <Link to="/library">
                <motion.button
                  className="px-10 py-4 rounded-full text-lg font-semibold text-white relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                    boxShadow: '0 10px 40px rgba(59, 130, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.3)',
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 15px 50px rgba(59, 130, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.5)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Hemen okumaya başla"
                >
                  {/* Animated Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                  <span className="relative z-10">Şimdi Oku</span>
                </motion.button>
              </Link>
            </motion.div>

            {/* Floating Stats or Features - Optional decorative elements */}
            <motion.div
              className="flex items-center justify-center gap-8 mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              {[
                { label: '10K+ Başlık', icon: Book },
                { label: 'HD Kalite', icon: Sparkles },
                { label: 'Günlük Güncelleme', icon: Zap },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + idx * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <feature.icon className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium text-white">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Popüler Seriler Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background with Particle System */}
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        
        {/* Dark overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background-pure-dark via-slate-900/95 to-background-pure-dark" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md mb-4"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Trend</span>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Popüler Seriler
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              En çok okunan ve beğenilen manga serilerini keşfedin
            </p>
          </motion.div>

          {/* Manga Cards Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            </div>
          ) : popularManga.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {popularManga.map((manga, idx) => (
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
              <p className="text-slate-400 text-lg">Henüz manga bulunmuyor.</p>
            </div>
          )}
        </div>
      </section>

      {/* Son Yüklenenler Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background with Particle System */}
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        
        {/* Dark overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background-pure-dark via-slate-900/95 to-background-pure-dark" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md mb-4"
              style={{
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}
            >
              <Sparkles className="h-5 w-5 text-pink-400" />
              <span className="text-sm font-medium text-pink-300">Yeni</span>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Son Yüklenenler
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              En yeni eklenen manga ve webtoon serilerini keşfedin
            </p>
          </motion.div>

          {/* Manga Cards Grid - 6x4 */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            </div>
          ) : latestManga.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {latestManga.map((manga, idx) => (
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
              <p className="text-slate-400 text-lg">Henüz manga bulunmuyor.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative py-16 overflow-hidden border-t border-purple-500/20">
        {/* Background with Particle System */}
        <div className="absolute inset-0 z-0">
          <ParticleSystem />
        </div>
        
        {/* Dark overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-background-pure-dark" />

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Brand Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                  }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <Sparkles className="h-6 w-6 text-pink-400" />
                </motion.div>
                <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  MangaFlow
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-4">
                Türkiye'nin en kapsamlı manga ve webtoon platformu. Binlerce seri, günlük güncellemeler ve harika bir okuma deneyimi.
              </p>
              <div className="flex items-center gap-3">
                <motion.a
                  href="#"
                  className="p-2 rounded-lg backdrop-blur-md transition-all duration-300"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'rgba(139, 92, 246, 0.3)',
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                  }}
                >
                  <Github className="h-5 w-5 text-purple-400" />
                </motion.a>
                <motion.a
                  href="#"
                  className="p-2 rounded-lg backdrop-blur-md transition-all duration-300"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'rgba(139, 92, 246, 0.3)',
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                  }}
                >
                  <MessageCircle className="h-5 w-5 text-purple-400" />
                </motion.a>
                <motion.a
                  href="#"
                  className="p-2 rounded-lg backdrop-blur-md transition-all duration-300"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'rgba(236, 72, 153, 0.3)',
                    borderColor: 'rgba(236, 72, 153, 0.5)',
                  }}
                >
                  <Heart className="h-5 w-5 text-pink-400" />
                </motion.a>
              </div>
            </motion.div>

            {/* Hızlı Linkler */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-400" />
                Hızlı Linkler
              </h3>
              <ul className="space-y-3">
                {['Keşfet', 'Popüler Seriler', 'Yeni Eklenenler', 'Kategoriler', 'Favorilerim', 'Okuma Listesi'].map((link, idx) => (
                  <motion.li
                    key={link}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to="#"
                      className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors duration-300 group"
                    >
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      <span>{link}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Kategoriler */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Book className="h-5 w-5 text-blue-400" />
                Kategoriler
              </h3>
              <ul className="space-y-3">
                {['Aksiyon', 'Romantik', 'Fantezi', 'Drama', 'Komedi', 'Bilim Kurgu'].map((category, idx) => (
                  <motion.li
                    key={category}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to="#"
                      className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors duration-300 group"
                    >
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      <span>{category}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* İletişim & Destek */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-pink-400" />
                İletişim & Destek
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:info@mangaflow.com"
                    className="flex items-center gap-2 text-slate-400 hover:text-pink-400 transition-colors duration-300 group"
                  >
                    <Mail className="h-4 w-4" />
                    <span>info@mangaflow.com</span>
                  </a>
                </li>
                <li className="pt-4 space-y-3">
                  {['Hakkımızda', 'SSS', 'Destek', 'İletişim', 'Gizlilik Politikası', 'Kullanım Koşulları'].map((link, idx) => (
                    <motion.div
                      key={link}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to="#"
                        className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors duration-300 group"
                      >
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                        <span>{link}</span>
                      </Link>
                    </motion.div>
                  ))}
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="h-px mb-8"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
            }}
          />

          {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-slate-500 text-sm"
            >
              © 2025 MangaFlow. Tüm hakları saklıdır.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-1"
            >
              <span className="text-slate-500 text-sm">Türkiye'nin En İyi</span>
              <motion.span
                className="text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text font-semibold text-sm"
                animate={{
                  backgroundPosition: ['0%', '100%', '0%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                Manga & Webtoon
              </motion.span>
              <span className="text-slate-500 text-sm">Platformu</span>
              <Sparkles className="h-4 w-4 text-purple-400 ml-1" />
            </motion.div>
          </div>
        </div>
      </footer>
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
  isFavorite: boolean;
  onToggleFavorite: (mangaId: string) => Promise<any>;
}

function MangaCard({ manga, index, isFavorite, onToggleFavorite }: MangaCardProps) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Link'e tıklamayı engelle
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
          {/* Cover Image Container */}
          <div className="relative aspect-[3/4] overflow-hidden flex-shrink-0">
            <motion.img
              src={manga.cover}
              alt={manga.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />
            
            {/* Gradient Overlay */}
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

            {/* Stats Overlay - Shows on Hover */}
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

          {/* Card Info - Fixed Height */}
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

          {/* Glow Effect on Hover */}
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
