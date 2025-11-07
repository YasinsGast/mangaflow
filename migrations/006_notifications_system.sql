-- Migration: Create notifications table and supporting features
-- Description: Comprehensive notification system for MangaFlow

-- 1. Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Reference to profiles.id (no FK constraint per best practices)
    type VARCHAR(50) NOT NULL, -- 'chapter_update', 'comment_reply', 'like_notification', 'follow_notification', 'admin_message'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data like manga_id, chapter_id, comment_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration for notifications
    action_url TEXT -- Direct URL for notification action (e.g., /manga/slug/chapter)
);

-- 2. Create index for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 3. Create user_follows table for follow functionality
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL, -- User who follows
    following_id UUID NOT NULL, -- User being followed (manga uploader)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Index for follow queries
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- 4. Create manga_bookmarks table enhancement for notifications
-- (If not exists - for users who bookmark mangas to get chapter updates)
CREATE TABLE IF NOT EXISTS manga_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    manga_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, manga_id)
);

-- Index for bookmark notifications
CREATE INDEX IF NOT EXISTS idx_manga_bookmarks_manga ON manga_bookmarks(manga_id);

-- 5. Add notification preferences to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "chapter_updates": true,
    "comment_replies": true,
    "like_notifications": true,
    "follow_notifications": true,
    "admin_messages": true,
    "email_notifications": false
}';

-- 6. RLS Policies for notifications table
-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow insert for both anon and service_role (for edge functions)
CREATE POLICY "Allow notification inserts" ON notifications
    FOR INSERT
    WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. RLS Policies for user_follows table
CREATE POLICY "Users can read follow relationships" ON user_follows
    FOR SELECT
    USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follows" ON user_follows
    FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON user_follows
    FOR DELETE
    USING (auth.uid() = follower_id);

-- 8. RLS Policies for manga_bookmarks table
CREATE POLICY "Users can read own bookmarks" ON manga_bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks" ON manga_bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON manga_bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE manga_bookmarks ENABLE ROW LEVEL SECURITY;

-- 10. Function to create notifications automatically
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications() RETURNS VOID AS $$
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger function for comment reply notifications
CREATE OR REPLACE FUNCTION notify_comment_reply() RETURNS TRIGGER AS $$
DECLARE
    parent_user_id UUID;
    manga_title TEXT;
    notification_title TEXT;
    notification_message TEXT;
    action_url TEXT;
BEGIN
    -- Only create notification for replies (not top-level comments)
    IF NEW.parent_id IS NOT NULL THEN
        -- Get parent comment user
        SELECT user_id INTO parent_user_id 
        FROM comments 
        WHERE id = NEW.parent_id;
        
        -- Don't notify if user replies to their own comment
        IF parent_user_id != NEW.user_id THEN
            -- Get manga title
            SELECT title INTO manga_title 
            FROM mangas 
            WHERE id = NEW.manga_id;
            
            -- Create notification
            notification_title := 'Yeni Cevap Aldınız';
            notification_message := manga_title || ' adlı eserdeki yorumunuza yeni bir cevap geldi.';
            action_url := '/manga/' || (SELECT slug FROM mangas WHERE id = NEW.manga_id);
            
            PERFORM create_notification(
                parent_user_id,
                'comment_reply',
                notification_title,
                notification_message,
                jsonb_build_object(
                    'manga_id', NEW.manga_id,
                    'comment_id', NEW.id,
                    'parent_comment_id', NEW.parent_id,
                    'manga_title', manga_title
                ),
                action_url
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger function for chapter update notifications
CREATE OR REPLACE FUNCTION notify_chapter_update() RETURNS TRIGGER AS $$
DECLARE
    manga_title TEXT;
    notification_title TEXT;
    notification_message TEXT;
    action_url TEXT;
    bookmark_user RECORD;
BEGIN
    -- Only notify for approved chapters
    IF NEW.status = 'approved' THEN
        -- Get manga title
        SELECT title INTO manga_title 
        FROM mangas 
        WHERE id = NEW.manga_id;
        
        -- Create notification content
        notification_title := 'Yeni Bölüm!';
        notification_message := manga_title || ' - Bölüm ' || NEW.chapter_number || ' yayınlandı!';
        action_url := '/manga/' || (SELECT slug FROM mangas WHERE id = NEW.manga_id);
        
        -- Notify all users who bookmarked this manga
        FOR bookmark_user IN 
            SELECT user_id FROM manga_bookmarks WHERE manga_id = NEW.manga_id
        LOOP
            PERFORM create_notification(
                bookmark_user.user_id,
                'chapter_update',
                notification_title,
                notification_message,
                jsonb_build_object(
                    'manga_id', NEW.manga_id,
                    'chapter_id', NEW.id,
                    'chapter_number', NEW.chapter_number,
                    'manga_title', manga_title
                ),
                action_url
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Trigger function for like notifications
CREATE OR REPLACE FUNCTION notify_comment_like() RETURNS TRIGGER AS $$
DECLARE
    comment_user_id UUID;
    manga_title TEXT;
    notification_title TEXT;
    notification_message TEXT;
    action_url TEXT;
BEGIN
    -- Get comment owner
    SELECT user_id INTO comment_user_id 
    FROM comments 
    WHERE id = NEW.comment_id;
    
    -- Don't notify if user likes their own comment
    IF comment_user_id != NEW.user_id THEN
        -- Get manga title
        SELECT m.title, m.slug INTO manga_title, action_url
        FROM mangas m
        JOIN comments c ON c.manga_id = m.id
        WHERE c.id = NEW.comment_id;
        
        action_url := '/manga/' || action_url;
        
        -- Create notification based on like type
        IF NEW.is_like THEN
            notification_title := 'Yorumunuz Beğenildi';
            notification_message := manga_title || ' adlı eserdeki yorumunuz beğenildi.';
        ELSE
            notification_title := 'Yorumunuz Değerlendirildi';
            notification_message := manga_title || ' adlı eserdeki yorumunuz değerlendirildi.';
        END IF;
        
        PERFORM create_notification(
            comment_user_id,
            'like_notification',
            notification_title,
            notification_message,
            jsonb_build_object(
                'comment_id', NEW.comment_id,
                'is_like', NEW.is_like,
                'manga_title', manga_title
            ),
            action_url
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create triggers
-- Trigger for comment replies
DROP TRIGGER IF EXISTS trigger_comment_reply_notification ON comments;
CREATE TRIGGER trigger_comment_reply_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_reply();

-- Trigger for chapter updates
DROP TRIGGER IF EXISTS trigger_chapter_update_notification ON chapters;
CREATE TRIGGER trigger_chapter_update_notification
    AFTER INSERT OR UPDATE OF status ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION notify_chapter_update();

-- Trigger for comment likes
DROP TRIGGER IF EXISTS trigger_comment_like_notification ON comment_likes;
CREATE TRIGGER trigger_comment_like_notification
    AFTER INSERT ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_like();

-- Migration completed successfully