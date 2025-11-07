import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Star, TrendingUp, Clock, Users, X } from 'lucide-react';

interface FilterProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export interface FilterState {
  search: string;
  genre: string[];
  rating: number;
  status: string;
  sortBy: string;
}

const genres = [
  'Aksiyon', 'Romantik', 'Drama', 'Komedi', 'Korku', 'Fantastik', 
  'Gizem', 'Bilim Kurgu', 'Macera', 'Psikoloji', 'Okul', 'Spor'
];

const statusOptions = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'ongoing', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'hiatus', label: 'Ara' },
];

const sortOptions = [
  { value: 'rating', label: 'En Yüksek Puanlı' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'newest', label: 'En Yeni' },
  { value: 'title', label: 'Alfabetik' },
];

export default function FilterSystem({ onFilterChange, totalCount, filteredCount }: FilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    genre: [],
    rating: 0,
    status: '',
    sortBy: 'rating',
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleGenre = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter(g => g !== genre)
        : [...prev.genre, genre]
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      genre: [],
      rating: 0,
      status: '',
      sortBy: 'rating',
    });
  };

  const hasActiveFilters = filters.search || filters.genre.length > 0 || 
                          filters.rating > 0 || filters.status;

  return (
    <motion.div 
      className="w-full mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Search Bar */}
      <div className="relative mb-6">
        <motion.div
          className={`relative rounded-xl transition-all duration-300 ${
            searchFocus 
              ? 'shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
              : 'shadow-[0_0_15px_rgba(59,130,246,0.1)]'
          }`}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-300" />
          <input
            type="text"
            placeholder="Manga veya webtoon ara..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-blue-200 outline-none text-lg"
          />
          {filters.search && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => updateFilter('search', '')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-blue-300" />
            </motion.button>
          )}
        </motion.div>
        
        {/* AI Suggestions (Mock) */}
        <AnimatePresence>
          {searchFocus && filters.search.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 w-full rounded-xl z-50"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div className="p-4">
                <p className="text-blue-300 text-sm mb-2">Akıllı Öneriler:</p>
                <div className="space-y-2">
                  {['Solo Leveling', 'Attack on Titan', 'Demon Slayer'].map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      onClick={() => updateFilter('search', suggestion)}
                      className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                      whileHover={{ x: 5 }}
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Filter className="h-4 w-4" />
          <span className="text-white font-medium">Filtreler</span>
          {hasActiveFilters && (
            <span className="bg-accent-primary text-white text-xs px-2 py-1 rounded-full">
              {filters.genre.length + (filters.rating > 0 ? 1 : 0) + (filters.status ? 1 : 0)}
            </span>
          )}
        </motion.button>

        <div className="flex items-center gap-4">
          <span className="text-blue-300 text-sm">
            {filteredCount} / {totalCount} manga
          </span>
          {hasActiveFilters && (
            <motion.button
              onClick={clearFilters}
              className="text-red-400 hover:text-red-300 text-sm underline"
              whileHover={{ scale: 1.1 }}
            >
              Temizle
            </motion.button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="p-6 space-y-6">
              {/* Sort Options */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sıralama
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sortOptions.map(option => (
                    <motion.button
                      key={option.value}
                      onClick={() => updateFilter('sortBy', option.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        filters.sortBy === option.value
                          ? 'bg-accent-primary text-white'
                          : 'bg-white/10 text-blue-200 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              <div>
                <h3 className="text-white font-semibold mb-3">Türler</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {genres.map(genre => (
                    <motion.button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        filters.genre.includes(genre)
                          ? 'bg-accent-primary text-white'
                          : 'bg-white/10 text-blue-200 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {genre}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Rating & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Minimum Rating */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Minimum Puan
                  </h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <motion.button
                        key={rating}
                        onClick={() => updateFilter('rating', rating === filters.rating ? 0 : rating)}
                        className={`p-2 rounded-lg transition-all ${
                          filters.rating >= rating
                            ? 'text-accent-yellow'
                            : 'text-gray-400 hover:text-accent-yellow'
                        }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Star className={`h-5 w-5 ${filters.rating >= rating ? 'fill-current' : ''}`} />
                      </motion.button>
                    ))}
                    <span className="text-blue-200 ml-2">
                      {filters.rating > 0 ? `${filters.rating}+ yıldız` : 'Tümü'}
                    </span>
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Durum
                  </h3>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter('status', option.value)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          filters.status === option.value
                            ? 'bg-accent-primary text-white'
                            : 'bg-white/10 text-blue-200 hover:bg-white/20'
                        }`}
                        whileHover={{ x: 5 }}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}