import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface UseFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  toggleFollow: () => Promise<void>;
  checkFollowStatus: () => Promise<void>;
}

export function useFollow(mangaId: string): UseFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const checkFollowStatus = async () => {
    if (!user || !mangaId) {
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_manga_follows')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle();

      if (error) {
        console.error('Follow status check error:', error);
        setIsFollowing(false);
      } else {
        setIsFollowing(!!data);
      }
    } catch (err) {
      console.error('Follow status check error:', err);
      setIsFollowing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      toast.error('Takip etmek için giriş yapmalısınız');
      return;
    }

    if (!mangaId) {
      toast.error('Geçersiz manga ID');
      return;
    }

    try {
      setIsLoading(true);

      const action = isFollowing ? 'unfollow' : 'follow';

      const { data, error } = await supabase.functions.invoke('manage-follow', {
        body: {
          mangaId,
          action
        }
      });

      if (error) {
        throw error;
      }

      // Check if response has nested data
      const responseData = data?.data || data;

      if (responseData?.message) {
        toast.success(responseData.message);
      } else {
        toast.success(isFollowing ? 'Takip listesinden çıkarıldı' : 'Takip listesine eklendi');
      }

      // Update local state
      setIsFollowing(!isFollowing);

      // Refresh status
      await checkFollowStatus();
    } catch (err: any) {
      console.error('Toggle follow error:', err);
      toast.error(err.message || 'İşlem başarısız oldu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkFollowStatus();
  }, [user, mangaId]);

  return {
    isFollowing,
    isLoading,
    toggleFollow,
    checkFollowStatus
  };
}
