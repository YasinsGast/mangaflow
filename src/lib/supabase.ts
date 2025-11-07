import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export common types with overrides
export type Manga = Omit<Database['public']['Tables']['mangas']['Row'], 'status' | 'categories'> & {
  status: 'ongoing' | 'completed' | 'hiatus' | null;
  categories?: string[] | null;
};
export type Chapter = Database['public']['Tables']['chapters']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'] & {
  manga_id?: string | null;
  chapter_id?: string | null;
  message?: string;
};
export type UserMangaFollow = Database['public']['Tables']['user_manga_follows']['Row'];

// Temporary types for manga_ratings table until types are regenerated
export interface MangaRating {
  id: string;
  user_id: string;
  manga_id: string;
  rating: number;
  rating_type: 'user_rating' | 'fansub_rating' | 'critic_rating';
  review_text?: string | null;
  is_recommended?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface MangaRatingInsert {
  id?: string;
  user_id: string;
  manga_id: string;
  rating: number;
  rating_type?: 'user_rating' | 'fansub_rating' | 'critic_rating';
  review_text?: string | null;
  is_recommended?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface MangaRatingUpdate {
  id?: string;
  user_id?: string;
  manga_id?: string;
  rating?: number;
  rating_type?: 'user_rating' | 'fansub_rating' | 'critic_rating';
  review_text?: string | null;
  is_recommended?: boolean | null;
  created_at?: string;
  updated_at?: string;
}
