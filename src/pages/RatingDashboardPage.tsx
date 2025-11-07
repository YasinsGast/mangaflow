import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Star, TrendingUp, Heart, Calendar, Award, Target, Activity } from 'lucide-react';
import ParticleSystem from '@/components/ParticleSystem';
import { StarRating, CompactStarRating } from '@/components/StarRating';
import { useRating, type RatingAnalytics, type UserRatingHistory } from '@/hooks/useRating';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function RatingDashboardPage() {
  const { user } = useAuth();
  const { getUserRatingAnalytics, getUserRatingHistory } = useRating();
  
  const [analytics, setAnalytics] = useState<RatingAnalytics | null>(null);
  const [recentRatings, setRecentRatings] = useState<UserRatingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load analytics and recent ratings
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, recentData] = await Promise.all([
          getUserRatingAnalytics(),
          getUserRatingHistory(undefined, 5) // Get last 5 ratings
        ]);
        
        setAnalytics(analyticsData);
        setRecentRatings(recentData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Dashboard verileri yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, getUserRatingAnalytics, getUserRatingHistory]);

  const getRatingDistributionData = () => {
    if (!analytics) return [];
    
    return [
      { label: 'Yüksek (8-10)', count: analytics.highRatingsGiven, color: 'bg-green-500', percentage: (analytics.highRatingsGiven / analytics.totalRatingsGiven) * 100 },
      { label: 'Orta (5-7)', count: analytics.mediumRatingsGiven, color: 'bg-yellow-500', percentage: (analytics.mediumRatingsGiven / analytics.totalRatingsGiven) * 100 },
      { label: 'Düşük (1-4)', count: analytics.lowRatingsGiven, color: 'bg-red-500', percentage: (analytics.lowRatingsGiven / analytics.totalRatingsGiven) * 100 },
    ].filter(item => item.count > 0);
  };

  const getRecentTrend = () => {
    if (!analytics || analytics.ratingTrends.length < 2) return null;
    
    const recent = analytics.ratingTrends.slice(-2);
    const current = recent[recent.length - 1];
    const previous = recent[recent.length - 2];
    
    const change = current.averageRating - previous.averageRating;
    return {
      change,
      isPositive: change > 0,
      currentAverage: current.averageRating
    };
  };

  const distributionData = getRatingDistributionData();
  const trend = getRecentTrend();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Giriş Yapmanız Gerekiyor</h1>
          <p className="text-gray-400 mb-6">Puanlama dashboard'unuzu görmek için giriş yapmalısınız.</p>
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
              <BarChart3 className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">
                Puanlama Dashboard'um
              </h1>
            </div>
            <p className="text-gray-400">
              Puanlama alışkanlıklarınızı ve istatistiklerinizi keşfedin
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : analytics ? (
            <div className="space-y-8">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 backdrop-blur-sm border border-blue-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-6 h-6 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Toplam Puanlama</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{analytics.totalRatingsGiven}</div>
                  <div className="text-sm text-gray-400">manga değerlendirildi</div>
                </div>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 backdrop-blur-sm border border-green-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Ortalama Puanım</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{analytics.averageRatingGiven?.toFixed(1) || '0'}</div>
                  <div className="text-sm text-gray-400">
                    /10 {trend && (
                      <span className={cn('ml-1', trend.isPositive ? 'text-green-400' : 'text-red-400')}>
                        {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.change).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-6 h-6 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Tavsiyelerim</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{analytics.recommendationsGiven}</div>
                  <div className="text-sm text-gray-400">
                    %{analytics.totalRatingsGiven > 0 ? ((analytics.recommendationsGiven / analytics.totalRatingsGiven) * 100).toFixed(0) : '0'} tavsiye oranı
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 backdrop-blur-sm border border-orange-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-6 h-6 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">Son Aktivite</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {analytics.lastRatingDate 
                      ? new Date(analytics.lastRatingDate).toLocaleDateString('tr-TR', { 
                          day: 'numeric', 
                          month: 'short' 
                        })
                      : 'Henüz yok'
                    }
                  </div>
                  <div className="text-sm text-gray-400">son puanlama</div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Puan Dağılımım</h3>
                </div>
                
                {distributionData.length > 0 ? (
                  <div className="space-y-4">
                    {distributionData.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.label}</span>
                          <span className="text-gray-400">{item.count} ({item.percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={cn('h-2 rounded-full transition-all duration-500', item.color)}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Henüz puanlama yapmadınız
                  </div>
                )}
              </div>

              {/* Rating Trends Chart */}
              {analytics.ratingTrends.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <h3 className="text-xl font-semibold text-white">Puanlama Trendlerim</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {analytics.ratingTrends.slice(-6).map((trend, index) => (
                      <div key={index} className="text-center">
                        <div className="text-sm text-gray-400 mb-1">
                          {new Date(trend.month + '-01').toLocaleDateString('tr-TR', { 
                            month: 'short',
                            year: '2-digit'
                          })}
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {trend.averageRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {trend.totalRatings} puan
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Ratings */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-purple-400" />
                    <h3 className="text-xl font-semibold text-white">Son Puanlarım</h3>
                  </div>
                  <Link 
                    to="/rating-history"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Tümünü Görüntüle →
                  </Link>
                </div>

                {recentRatings.length > 0 ? (
                  <div className="space-y-4">
                    {recentRatings.map((rating) => (
                      <div key={rating.id} className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg">
                        <Link to={`/manga/${rating.manga.slug}`} className="flex-shrink-0">
                          <img
                            src={rating.manga.coverImageUrl || '/images/manga-placeholder.jpg'}
                            alt={rating.manga.title}
                            className="w-12 h-12 object-cover rounded-lg hover:scale-105 transition-transform"
                          />
                        </Link>
                        
                        <div className="flex-1">
                          <Link 
                            to={`/manga/${rating.manga.slug}`}
                            className="font-medium text-white hover:text-blue-400 transition-colors line-clamp-1"
                          >
                            {rating.manga.title}
                          </Link>
                          <div className="text-sm text-gray-400">
                            {new Date(rating.createdAt).toLocaleDateString('tr-TR')}
                            {rating.isRecommended && (
                              <span className="ml-2 text-green-400">• Tavsiye Ediliyor</span>
                            )}
                          </div>
                        </div>
                        
                        <CompactStarRating value={rating.rating} maxRating={10} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Henüz puanlama yapmadınız
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  to="/rating-history"
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6 hover:from-blue-600/30 hover:to-purple-600/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Star className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold text-white">Puanlama Geçmişim</h4>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Tüm puanlarınızı, yorumlarınızı ve tavsiyelerinizi görüntüleyin
                  </p>
                </Link>

                <Link 
                  to="/"
                  className="bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 rounded-xl p-6 hover:from-green-600/30 hover:to-teal-600/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold text-white">Yeni Manga Bul</h4>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Puanlamak için yeni manga'lar keşfedin ve değerlendirin
                  </p>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                Henüz puanlama yapmadınız
              </h3>
              <p className="text-gray-500 mb-6">
                Manga'ları puanlamaya başlayın ve kişisel istatistiklerinizi görün!
              </p>
              <Link 
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Star className="w-4 h-4" />
                Manga'ları Keşfet
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}