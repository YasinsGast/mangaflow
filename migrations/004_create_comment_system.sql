-- Migration: Comment System
-- Purpose: User comments on manga with threaded replies, likes/dislikes, spoiler blur, moderation
-- Date: 2025-11-04

-- ================================================
-- 1. COMMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID, -- Threaded replies
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  is_spoiler BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE, -- Moderation support
  like_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_comments_manga_id ON comments(manga_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_approved ON comments(is_approved);

-- ================================================
-- 2. COMMENT LIKES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_like BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = like, FALSE = dislike
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- One vote per user per comment
);

-- Indexes for performance
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- ================================================
-- 3. RLS POLICIES - COMMENTS
-- ================================================

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Public read: Approved comments only
CREATE POLICY "Public can read approved comments"
ON comments FOR SELECT
USING (is_approved = TRUE);

-- Authenticated users can insert their own comments
CREATE POLICY "Users can insert their own comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments (content, is_spoiler only)
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- Admins and moderators can manage all comments
CREATE POLICY "Admins and moderators can manage all comments"
ON comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- ================================================
-- 4. RLS POLICIES - COMMENT LIKES
-- ================================================

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (for like counts)
CREATE POLICY "Anyone can read comment likes"
ON comment_likes FOR SELECT
TO authenticated, anon
USING (TRUE);

-- Authenticated users can insert/update/delete their own likes
CREATE POLICY "Users can manage their own likes"
ON comment_likes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 5. FUNCTIONS: Update like_count trigger
-- ================================================

-- Function to update comment like_count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET like_count = like_count + (CASE WHEN NEW.is_like THEN 1 ELSE -1 END)
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_like != NEW.is_like THEN
      UPDATE comments 
      SET like_count = like_count + (CASE WHEN NEW.is_like THEN 2 ELSE -2 END)
      WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET like_count = like_count - (CASE WHEN OLD.is_like THEN 1 ELSE -1 END)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment_likes
DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR UPDATE OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- ================================================
-- 6. FUNCTIONS: Update reply_count trigger
-- ================================================

-- Function to update parent comment reply_count
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE comments 
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE comments 
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments (reply count)
DROP TRIGGER IF EXISTS trigger_update_comment_reply_count ON comments;
CREATE TRIGGER trigger_update_comment_reply_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

-- ================================================
-- 7. FUNCTIONS: Update updated_at timestamp
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments (updated_at)
DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON comments;
CREATE TRIGGER trigger_update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comments_updated_at();

-- ================================================
-- 8. GRANT PERMISSIONS
-- ================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comment_likes TO authenticated;

-- Grant select to anonymous users (for public read)
GRANT SELECT ON comments TO anon;
GRANT SELECT ON comment_likes TO anon;

-- ================================================
-- END OF MIGRATION
-- ================================================
