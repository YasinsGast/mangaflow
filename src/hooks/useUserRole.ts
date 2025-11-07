import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type UserRole = 'user' | 'fansub' | 'moderator' | 'admin';

interface UserProfile {
  id: string;
  username: string;
  user_role: UserRole;
}

export function useUserRole() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, user_role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Profil yüklenirken hata:', error);
          setError(error.message);
          return;
        }

        if (data) {
          setProfile(data);
        }
      } catch (err: any) {
        console.error('Profil yüklenirken beklenmeyen hata:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return {
    profile,
    userRole: profile?.user_role || 'user',
    loading,
    error,
    isAdmin: profile?.user_role === 'admin',
    isModerator: profile?.user_role === 'moderator',
    isFansub: profile?.user_role === 'fansub',
    isUser: profile?.user_role === 'user',
  };
}