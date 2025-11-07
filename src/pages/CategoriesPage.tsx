import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Grid3x3, Sparkles, Book, ChevronRight, ArrowUpDown } from 'lucide-react';

import ParticleSystem from '@/components/ParticleSystem';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

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

export default function CategoriesPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'popular' | 'least_popular' | 'newest'>('alphabetical');
  const [sortedCategories, setSortedCategories] = useState<{name: string, count: number, orderIndex: number}[]>([]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch category counts
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch all approved manga
        const { data, error } = await supabase
          .from('mangas')
          .select('categories')
          .eq('approval_status', 'approved');
        
        if (error) throw error;
        
        // Count manga per category
        const counts: Record<string, number> = {};
        
        data?.forEach((manga) => {
          const categories = (manga.categories as string[]) || [];
          categories.forEach((cat: string) => {
            counts[cat] = (counts[cat] || 0) + 1;
          });
        });
        
        setCategoryCounts(counts);
        
        // Create sorted categories array with counts
        const categoriesWithCounts = allCategories.map((category, index) => ({
          name: category,
          count: counts[category] || 0,
          orderIndex: index // Use original order for "newest" sorting
        }));
        setSortedCategories(categoriesWithCounts);
      } catch (error) {
        console.error('Error fetching category counts:', error);
        setCategoryCounts({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryCounts();
  }, []);

  // Handle sort change
  const handleSortChange = (option: typeof sortOption) => {
    setSortOption(option);
    
    let sorted = [...sortedCategories];
    
    switch (option) {
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        break;
      case 'popular':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'least_popular':
        sorted.sort((a, b) => a.count - b.count);
        break;
      case 'newest':
        sorted.sort((a, b) => a.count - b.count); // En az popüler olanlar "yeni" sayılır
        break;
    }
    
    setSortedCategories(sorted);
  };

  // Get current sorted categories or fall back to allCategories
  const getCurrentCategories = () => {
    if (sortedCategories.length > 0) {
      return sortedCategories;
    }
    return allCategories.map((category, index) => ({
      name: category,
      count: categoryCounts[category] || 0,
      orderIndex: index
    }));
  };

  // Create slug from category name
  const createSlug = (category: string) => {
    return category
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };

  // Gradient colors for cards
  const gradientColors = [
    'from-purple-500/20 to-pink-500/20',
    'from-blue-500/20 to-cyan-500/20',
    'from-pink-500/20 to-rose-500/20',
    'from-indigo-500/20 to-purple-500/20',
    'from-green-500/20 to-emerald-500/20',
    'from-orange-500/20 to-red-500/20',
  ];

  const borderColors = [
    'rgba(139, 92, 246, 0.3)',
    'rgba(59, 130, 246, 0.3)',
    'rgba(236, 72, 153, 0.3)',
    'rgba(99, 102, 241, 0.3)',
    'rgba(16, 185, 129, 0.3)',
    'rgba(249, 115, 22, 0.3)',
  ];

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
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <Grid3x3 className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Tüm Kategoriler</span>
            </motion.div>
            
            {/* Title */}
            {/* Title and Sort */}
            <div className="text-center">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:text-left mb-6">
                <h1 className="text-4xl md:text-6xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Kategoriler
                  </span>
                </h1>
                <div className="mt-4 sm:mt-0">
                  <SortDropdown onSortChange={handleSortChange} currentSort={sortOption} />
                </div>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              İlgi alanlarına göre manga ve webtoon keşfet. Binlerce seri, yüzlerce kategori.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid Section */}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getCurrentCategories().map((categoryData, idx) => (
                <CategoryCard
                  key={categoryData.name}
                  category={categoryData.name}
                  count={categoryData.count}
                  slug={createSlug(categoryData.name)}
                  index={idx}
                  gradientColor={gradientColors[idx % gradientColors.length]}
                  borderColor={borderColors[idx % borderColors.length]}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Sort Dropdown Component
interface SortDropdownProps {
  onSortChange: (option: 'alphabetical' | 'popular' | 'least_popular' | 'newest') => void;
  currentSort: 'alphabetical' | 'popular' | 'least_popular' | 'newest';
}

function SortDropdown({ onSortChange, currentSort }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: 'alphabetical', label: 'Alfabetik (A-Z)' },
    { value: 'popular', label: 'Popüler (Manga Sayısına Göre)' },
    { value: 'least_popular', label: 'En Az Popüler' },
    { value: 'newest', label: 'Yeni Kategoriler' }
  ] as const;

  const getCurrentLabel = () => {
    const option = sortOptions.find(opt => opt.value === currentSort);
    return option?.label || sortOptions[0].label;
  };

  const handleSortSelect = (option: typeof currentSort) => {
    onSortChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md border transition-all duration-300 hover:border-purple-400/50"
        style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: 'rgba(139, 92, 246, 0.3)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ArrowUpDown className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-medium text-white hidden sm:block">
          {getCurrentLabel()}
        </span>
        <span className="text-sm font-medium text-white sm:hidden">
          Sırala
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-purple-400"
        >
          <ChevronRight className="h-4 w-4 rotate-90" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ 
          opacity: isOpen ? 1 : 0, 
          y: isOpen ? 0 : -10,
          scale: isOpen ? 1 : 0.95,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        transition={{ duration: 0.2 }}
        className="absolute right-0 top-full mt-2 min-w-48 z-50"
      >
        <div
          className="rounded-xl backdrop-blur-md border p-2"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: 'rgba(139, 92, 246, 0.3)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {sortOptions.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => handleSortSelect(option.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                currentSort === option.value
                  ? 'text-purple-400 bg-purple-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              whileHover={{ x: 4 }}
            >
              {option.label}
              {currentSort === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-block w-2 h-2 bg-purple-400 rounded-full ml-2"
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Category Card Component
interface CategoryCardProps {
  category: string;
  count: number;
  slug: string;
  index: number;
  gradientColor: string;
  borderColor: string;
}

function CategoryCard({ category, count, slug, index, gradientColor, borderColor }: CategoryCardProps) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.4, delay: index * 0.02 }}
    >
      <Link to={`/category/${slug}`}>
        <motion.div
          className={`group relative rounded-2xl overflow-hidden cursor-pointer p-6 bg-gradient-to-br ${gradientColor}`}
          style={{
            backdropFilter: 'blur(12px)',
            border: `1px solid ${borderColor}`,
            background: `linear-gradient(135deg, ${borderColor.replace('0.3', '0.1')}, ${borderColor.replace('0.3', '0.05')})`,
          }}
          whileHover={{ 
            scale: 1.03,
            borderColor: borderColor.replace('0.3', '0.6'),
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Icon */}
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="p-3 rounded-xl"
              style={{
                background: borderColor.replace('0.3', '0.2'),
                border: `1px solid ${borderColor}`,
              }}
              whileHover={{ rotate: 5, scale: 1.1 }}
            >
              <Book className="h-6 w-6 text-purple-400" />
            </motion.div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                {category}
              </h3>
              <p className="text-slate-400 text-sm">
                {count > 0 ? `${count} manga` : 'Henüz manga yok'}
              </p>
            </div>
          </div>

          {/* Arrow Icon */}
          <motion.div
            className="flex items-center justify-end text-purple-400"
            whileHover={{ x: 5 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-5 w-5" />
          </motion.div>

          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)',
            }}
            whileHover={{
              boxShadow: '0 0 20px 2px rgba(139, 92, 246, 0.2)',
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}
