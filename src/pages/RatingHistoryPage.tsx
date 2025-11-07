import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, Calendar, TrendingUp, Heart, MessageCircle, Filter, ArrowUpDown } from 'lucide-react';
import ParticleSystem from '@/components/ParticleSystem';
import { StarRating, CompactStarRating } from '@/components/StarRating';
import { useRating, type UserRatingHistory } from '@/hooks/useRating';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

type SortOption = 'date' | 'rating' | 'title';
type FilterOption = 'all' | 'high' | 'medium' | 'low' | 'recommended';

export default function RatingHistoryPage() {
  const { user } = useAuth();
  const { getUserRatingHistory } = useRating();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [ratings, setRatings] = useState<UserRatingHistory[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<UserRatingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load ratings
  useEffect(() => {
    if (!user) return;
    
    const loadRatings = async () => {
      setIsLoading(true);
      try {
        const history = await getUserRatingHistory();
        setRatings(history);
      } catch (error) {
        console.error('Error loading rating history:', error);
        toast.error('Puanlama geçmişi yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadRatings();
  }, [user, getUserRatingHistory]);

  // Filter and sort ratings
  useEffect(() => {
    let filtered = [...ratings];

    // Apply filter
    switch (filterBy) {
      case 'high':
        filtered = filtered.filter(r => r.rating >= 8);
        break;
      case 'medium':
        filtered = filtered.filter(r => r.rating >= 5 && r.rating < 8);
        break;
      case 'low':
        filtered = filtered.filter(r => r.rating < 5);
        break;
      case 'recommended':
        filtered = filtered.filter(r => r.isRecommended === true);
        break;
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'title':
          comparison = a.manga.title.localeCompare(b.manga.title, 'tr');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredRatings(filtered);
  }, [ratings, sortBy, sortOrder, filterBy]);

  const handleSortChange = (newSort: SortOption) => {
    if (sortBy === newSort) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSort);
      setSortOrder('desc');
    }
  };

  const getFilterStats = () => {
    const total = ratings.length;
    const high = ratings.filter(r => r.rating >= 8).length;
    const medium = ratings.filter(r => r.rating >= 5 && r.rating < 8).length;
    const low = ratings.filter(r => r.rating < 5).length;
    const recommended = ratings.filter(r => r.isRecommended === true).length;
    
    return { total, high, medium, low, recommended };
  };

  const stats = getFilterStats();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Giriş Yapmanız Gerekiyor</h1>
          <p className="text-gray-400 mb-6">Puanlama geçmişinizi görmek için giriş yapmalısınız.</p>
          <Link 
            to="/auth"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <ParticleSystem />
      
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
              <h1 className="text-3xl font-bold text-white">
                Puanlama Geçmişim
              </h1>
            </div>
            <p className="text-gray-400">
              Değerlendirdiğiniz manga'ları ve puanlarınızı görüntüleyin
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Toplam</div>
                </div>
                <div className="bg-green-900/20 backdrop-blur-sm border border-green-700/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400">{stats.high}</div>
                  <div className="text-sm text-gray-400">Yüksek (8+)</div>
                </div>
                <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-700/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-yellow-400">{stats.medium}</div>
                  <div className="text-sm text-gray-400">Orta (5-7)</div>
                </div>
                <div className="bg-red-900/20 backdrop-blur-sm border border-red-700/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-400">{stats.low}</div>
                  <div className="text-sm text-gray-400">Düşük (&lt;5)</div>
                </div>
                <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-700/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-400">{stats.recommended}</div>
                  <div className="text-sm text-gray-400">Tavsiye</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-4 mb-6">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tümü ({stats.total})</option>
                    <option value="high">Yüksek Puan ({stats.high})</option>
                    <option value="medium">Orta Puan ({stats.medium})</option>
                    <option value="low">Düşük Puan ({stats.low})</option>
                    <option value="recommended">Tavsiye Ettiklerim ({stats.recommended})</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => handleSortChange('date')}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      sortBy === 'date' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800/50 text-gray-400 hover:text-white'
                    )}
                  >
                    Tarih {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </button>
                  <button
                    onClick={() => handleSortChange('rating')}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      sortBy === 'rating' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800/50 text-gray-400 hover:text-white'
                    )}
                  >
                    Puan {sortBy === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </button>
                  <button
                    onClick={() => handleSortChange('title')}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      sortBy === 'title' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800/50 text-gray-400 hover:text-white'
                    )}
                  >
                    İsim {sortBy === 'title' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </button>
                </div>
              </div>

              {/* Rating List */}
              {filteredRatings.length === 0 ? (
                <div className="text-center py-20">
                  <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    {filterBy === 'all' ? 'Henüz puanlama yapmadınız' : 'Bu filtrede puanlama bulunamadı'}
                  </h3>
                  <p className="text-gray-500">
                    {filterBy === 'all' ? 'Mangaları puanlamaya başlayın!' : 'Farklı bir filtre seçmeyi deneyin.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRatings.map((rating) => (
                    <div
                      key={rating.id}
                      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex gap-4">
                        {/* Manga Cover */}
                        <Link to={`/manga/${rating.manga.slug}`} className="flex-shrink-0">
                          <img
                            src={rating.manga.coverImageUrl || '/images/manga-placeholder.jpg'}
                            alt={rating.manga.title}
                            className="w-16 h-20 object-cover rounded-lg hover:scale-105 transition-transform"
                          />
                        </Link>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          {/* Title and Rating */}
                          <div className="flex items-start justify-between">
                            <div>
                              <Link 
                                to={`/manga/${rating.manga.slug}`}
                                className="text-lg font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1"
                              >
                                {rating.manga.title}
                              </Link>
                              {rating.manga.author && (
                                <p className="text-sm text-gray-400">{rating.manga.author}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <CompactStarRating value={rating.rating} maxRating={10} />
                            </div>
                          </div>

                          {/* Review Text */}
                          {rating.reviewText && (
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600/30">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-400">Yorumunuz</span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {rating.reviewText}
                              </p>
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(rating.createdAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            {rating.isRecommended && (
                              <div className="flex items-center gap-1 text-green-400">
                                <Heart className="w-4 h-4" />
                                Tavsiye Ediliyor
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}