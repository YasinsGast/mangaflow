-- Migration: Allow Anonymous Comments
-- Purpose: Enable users to comment without login (as "Anonim")
-- Date: 2025-11-04

-- ================================================
-- 1. MAKE USER_ID NULLABLE FOR ANONYMOUS COMMENTS
-- ================================================

-- Allow user_id to be null for anonymous comments
ALTER TABLE comments 
ALTER COLUMN user_id DROP NOT NULL;

-- ================================================
-- 2. CREATE ANONYMOUS PROFILE FALLBACK
-- ================================================

-- Create a function to handle anonymous comments display
CREATE OR REPLACE FUNCTION get_comment_author_display(comment_row comments)
RETURNS TABLE (
  username text,
  avatar_url text,
  user_role text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- If user_id is null (anonymous comment), return default values
  IF comment_row.user_id IS NULL THEN
    RETURN QUERY SELECT 
      'Anonim'::text,
      null::text,
      null::text;
  ELSE
    -- Return actual user profile data
    RETURN QUERY 
    SELECT 
      p.username,
      p.avatar_url,
      p.user_role
    FROM profiles p
    WHERE p.id = comment_row.user_id;
  END IF;
END;
$$;

-- ================================================
-- 3. UPDATE RLS POLICIES FOR ANONYMOUS COMMENTS
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comments;
DROP POLICY IF EXISTS "Enable update for comment owners" ON comments;
DROP POLICY IF EXISTS "Enable delete for comment owners or admins" ON comments;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON comments;

-- New policy: Allow everyone to read comments
CREATE POLICY "Enable read access for all users" ON comments
  FOR SELECT USING (true);

-- New policy: Allow both authenticated and anonymous users to insert
CREATE POLICY "Enable insert for authenticated and anonymous users" ON comments
  FOR INSERT WITH CHECK (
    -- Allow if user_id is provided (authenticated user)
    (user_id IS NOT NULL AND auth.uid() = user_id) 
    OR 
    -- Allow if user_id is null (anonymous user)
    user_id IS NULL
  );

-- New policy: Allow users to update their own comments
CREATE POLICY "Enable update for comment owners" ON comments
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- New policy: Allow users to delete their own comments or admins
CREATE POLICY "Enable delete for comment owners or admins" ON comments
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

-- ================================================
-- 4. UPDATE COMMENT_LIKES FOR ANONYMOUS COMMENTS
-- ================================================

-- Drop existing comment_likes policies
DROP POLICY IF EXISTS "Enable read access for all users" ON comment_likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comment_likes;
DROP POLICY IF EXISTS "Enable update for users" ON comment_likes;
DROP POLICY IF EXISTS "Enable delete for users" ON comment_likes;

-- Comment likes still require authentication
CREATE POLICY "Enable read access for all users" ON comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users" ON comment_likes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- 5. PERFORMANCE INDEXES
-- ================================================

-- Index for null user_id queries (anonymous comments)
CREATE INDEX IF NOT EXISTS idx_comments_user_id_null 
ON comments(user_id) WHERE user_id IS NULL;

-- Index for querying anonymous comments
CREATE INDEX IF NOT EXISTS idx_comments_anonymous 
ON comments(manga_id, created_at DESC) WHERE user_id IS NULL;

-- ================================================
-- 6. TRIGGER UPDATES FOR ANONYMOUS COMMENTS
-- ================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_comment_like_count ON comments;
DROP TRIGGER IF EXISTS update_comment_reply_count ON comments;
DROP TRIGGER IF EXISTS update_comment_updated_at ON comments;

-- Recreate triggers with anonymous comment support
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_comment_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();

-- Note: Like count and reply count triggers don't need changes
-- They work fine with null user_id