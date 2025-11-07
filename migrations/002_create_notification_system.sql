-- ============================================
-- MangaFlow Bildirim Sistemi Migration
-- Tarih: 2025-11-03
-- ============================================

-- Kullanıcı manga takip sistemi
CREATE TABLE IF NOT EXISTS user_manga_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  manga_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, manga_id)
);

-- Bildirimler sistemi  
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  manga_id UUID NOT NULL,
  chapter_id UUID,
  type VARCHAR(50) DEFAULT 'new_chapter',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- RLS Policies - user_manga_follows
-- ============================================
ALTER TABLE user_manga_follows ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi takip listelerini görebilir
DROP POLICY IF EXISTS "Users can view their own follows" ON user_manga_follows;
CREATE POLICY "Users can view their own follows" ON user_manga_follows
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar manga takip edebilir (anon ve service_role için)
DROP POLICY IF EXISTS "Users can follow mangas" ON user_manga_follows;
CREATE POLICY "Users can follow mangas" ON user_manga_follows
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'service_role') AND auth.uid() = user_id);

-- Kullanıcılar takibi bırakabilir
DROP POLICY IF EXISTS "Users can unfollow mangas" ON user_manga_follows;
CREATE POLICY "Users can unfollow mangas" ON user_manga_follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - notifications
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi bildirimlerini görebilir
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Edge functions bildirimleri oluşturabilir
DROP POLICY IF EXISTS "Edge functions can create notifications" ON notifications;
CREATE POLICY "Edge functions can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- Kullanıcılar kendi bildirimlerini güncelleyebilir
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi bildirimlerini silebilir
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_manga_follows_user_id ON user_manga_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_manga_follows_manga_id ON user_manga_follows(manga_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- Başarı Mesajı
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE 'Bildirim sistemi migration başarıyla uygulandı!';
END $$;
