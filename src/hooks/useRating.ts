import { useState, useEffect } from 'react';
import { supabase, type MangaRating, type MangaRatingInsert, type MangaRatingUpdate } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  userRating?: number;
}

export interface UserRatingHistory {
  id: string;
  rating: number;
  ratingType: string;
  reviewText?: string;
  isRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
  manga: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
    author?: string;
  };
}

export interface RatingAnalytics {
  totalRatingsGiven: number;
  averageRatingGiven: number;
  highRatingsGiven: number;
  mediumRatingsGiven: number;
  lowRatingsGiven: number;
  recommendationsGiven: number;
  lastRatingDate?: string;
  firstRatingDate?: string;
  favoriteGenres: string[];
  ratingTrends: Array<{
    month: string;
    averageRating: number;
    totalRatings: number;
  }>;
}

export function useRating() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Rate a manga (1-10 scale)
  const rateManga = async (
    mangaId: string,
    rating: number,
    reviewText?: string,
    isRecommended?: boolean,
    ratingType: 'user_rating' | 'fansub_rating' | 'critic_rating' = 'user_rating'
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Puanlama yapabilmek için giriş yapmalısınız');
      return false;
    }

    if (rating < 1 || rating > 10) {
      toast.error('Puan 1-10 arasında olmalıdır');
      return false;
    }

    setIsLoading(true);
    try {
      const ratingData: MangaRatingInsert = {
        user_id: user.id,
        manga_id: mangaId,
        rating,
        rating_type: ratingType,
        review_text: reviewText || null,
        is_recommended: isRecommended || null,
      };

      const { data, error } = await supabase
        .from('manga_ratings' as any)
        .upsert(ratingData, {
          onConflict: 'user_id,manga_id,rating_type'
        })
        .select()
        .single();

      if (error) {
        console.error('Rating error:', error);
        toast.error('Puanlama sırasında hata oluştu');
        return false;
      }

      toast.success(`Manga ${rating}/10 puan ile değerlendirildi`);
      return true;
    } catch (error) {
      console.error('Rating error:', error);
      toast.error('Puanlama sırasında hata oluştu');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get rating stats for a manga
  const getMangaRatingStats = async (
    mangaId: string,
    ratingType: 'user_rating' | 'fansub_rating' | 'critic_rating' = 'user_rating'
  ): Promise<RatingStats | null> => {
    try {
      // Get ratings for this manga and type
      const { data: ratings, error } = await supabase
        .from('manga_ratings' as any)
        .select('rating, user_id')
        .eq('manga_id', mangaId)
        .eq('rating_type', ratingType) as any;

      if (error) {
        console.error('Error fetching rating stats:', error);
        return null;
      }

      if (!ratings || ratings.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: {},
          userRating: undefined,
        };
      }

      // Calculate stats
      const totalRatings = ratings.length;
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
      
      // Create rating distribution (1-10)
      const distribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) {
        distribution[i] = ratings.filter(r => r.rating === i).length;
      }

      // Get user's rating if logged in
      let userRating: number | undefined;
      if (user) {
        const userRatingRecord = ratings.find(r => r.user_id === user.id);
        userRating = userRatingRecord?.rating;
      }

      return {
        averageRating: Number(averageRating.toFixed(2)),
        totalRatings,
        ratingDistribution: distribution,
        userRating,
      };
    } catch (error) {
      console.error('Error fetching rating stats:', error);
      return null;
    }
  };

  // Get user's rating history
  const getUserRatingHistory = async (
    userId?: string,
    limit: number = 50
  ): Promise<UserRatingHistory[]> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return [];

    try {
      const { data, error } = await supabase
        .from('manga_ratings' as any)
        .select(`
          id,
          rating,
          rating_type,
          review_text,
          is_recommended,
          created_at,
          updated_at,
          mangas (
            id,
            title,
            slug,
            cover_image_url,
            author
          )
        `)
        .eq('user_id', targetUserId)
        .eq('rating_type', 'user_rating')
        .order('created_at', { ascending: false })
        .limit(limit) as any;

      if (error) {
        console.error('Error fetching rating history:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        rating: item.rating,
        ratingType: item.rating_type,
        reviewText: item.review_text || undefined,
        isRecommended: item.is_recommended || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        manga: {
          id: (item.mangas as any)?.id || '',
          title: (item.mangas as any)?.title || '',
          slug: (item.mangas as any)?.slug || '',
          coverImageUrl: (item.mangas as any)?.cover_image_url || '',
          author: (item.mangas as any)?.author || '',
        },
      }));
    } catch (error) {
      console.error('Error fetching rating history:', error);
      return [];
    }
  };

  // Get user rating analytics
  const getUserRatingAnalytics = async (userId?: string): Promise<RatingAnalytics | null> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;

    try {
      // Get user stats from view
      const { data: userStats, error: statsError } = await supabase
        .from('user_rating_stats' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .single() as any;

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching user stats:', statsError);
        return null;
      }

      // Get rating trends (monthly)
      const { data: ratingHistory, error: historyError } = await supabase
        .from('manga_ratings' as any)
        .select('rating, created_at')
        .eq('user_id', targetUserId)
        .eq('rating_type', 'user_rating')
        .order('created_at', { ascending: true }) as any;

      if (historyError) {
        console.error('Error fetching rating history:', historyError);
        return null;
      }

      // Calculate monthly trends
      const monthlyData: Record<string, { total: number; sum: number }> = {};
      ratingHistory?.forEach(rating => {
        const month = new Date(rating.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, sum: 0 };
        }
        monthlyData[month].total++;
        monthlyData[month].sum += rating.rating;
      });

      const ratingTrends = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        averageRating: Number((data.sum / data.total).toFixed(2)),
        totalRatings: data.total,
      }));

      return {
        totalRatingsGiven: userStats?.total_ratings_given || 0,
        averageRatingGiven: userStats?.average_rating_given || 0,
        highRatingsGiven: userStats?.high_ratings_given || 0,
        mediumRatingsGiven: userStats?.medium_ratings_given || 0,
        lowRatingsGiven: userStats?.low_ratings_given || 0,
        recommendationsGiven: userStats?.recommendations_given || 0,
        lastRatingDate: userStats?.last_rating_date || undefined,
        firstRatingDate: userStats?.first_rating_date || undefined,
        favoriteGenres: [], // TODO: Implement genre analysis
        ratingTrends,
      };
    } catch (error) {
      console.error('Error fetching rating analytics:', error);
      return null;
    }
  };

  // Delete a rating
  const deleteRating = async (
    mangaId: string,
    ratingType: 'user_rating' | 'fansub_rating' | 'critic_rating' = 'user_rating'
  ): Promise<boolean> => {
    if (!user) {
      toast.error('İşlem için giriş yapmalısınız');
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('manga_ratings' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .eq('rating_type', ratingType) as any;

      if (error) {
        console.error('Delete rating error:', error);
        toast.error('Puanı silerken hata oluştu');
        return false;
      }

      toast.success('Puanınız silindi');
      return true;
    } catch (error) {
      console.error('Delete rating error:', error);
      toast.error('Puanı silerken hata oluştu');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    rateManga,
    getMangaRatingStats,
    getUserRatingHistory,
    getUserRatingAnalytics,
    deleteRating,
    isLoading,
  };
}