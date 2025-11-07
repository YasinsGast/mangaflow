-- Migration: System Management Tables
-- Purpose: Logs, system settings, and permission management for ADIM 4
-- Date: 2025-11-04

-- ================================================
-- 1. SYSTEM LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type VARCHAR(50) NOT NULL, -- 'user_action', 'security', 'system', 'performance'
  action VARCHAR(100) NOT NULL, -- 'login', 'role_change', 'permission_violation', etc.
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- For user management actions
  target_resource_type VARCHAR(50), -- 'manga', 'chapter', 'user', 'setting'
  target_resource_id UUID,
  description TEXT,
  metadata JSONB, -- Additional context: IP, user agent, request details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_system_logs_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_severity ON system_logs(severity);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action ON system_logs(action);

-- ================================================
-- 2. SYSTEM SETTINGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'general', 'content', 'security', 'email', 'ui'
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Public settings can be read by anyone
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast key lookup
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ================================================
-- 3. USER ACTIVITY TRACKING (Extended profiles)
-- ================================================
-- Add columns to profiles table if not exist
DO $$ 
BEGIN
  -- Last login timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='last_login_at') THEN
    ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  
  -- Account status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='account_status') THEN
    ALTER TABLE profiles ADD COLUMN account_status VARCHAR(20) DEFAULT 'active';
  END IF;
  
  -- Email verified
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='email_verified') THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- Statistics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='total_mangas') THEN
    ALTER TABLE profiles ADD COLUMN total_mangas INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='total_chapters') THEN
    ALTER TABLE profiles ADD COLUMN total_chapters INTEGER DEFAULT 0;
  END IF;
END $$;

-- ================================================
-- 4. RLS POLICIES - SYSTEM LOGS
-- ================================================

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can read all logs"
  ON system_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

-- System can insert logs (service role)
CREATE POLICY "Service role can insert logs"
  ON system_logs FOR INSERT
  WITH CHECK (true);

-- Admins can delete old logs
CREATE POLICY "Admins can delete logs"
  ON system_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

-- ================================================
-- 5. RLS POLICIES - SYSTEM SETTINGS
-- ================================================

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can read all settings"
  ON system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

-- Public settings can be read by anyone
CREATE POLICY "Public settings are readable by all"
  ON system_settings FOR SELECT
  USING (is_public = true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete settings"
  ON system_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'admin'
    )
  );

-- ================================================
-- 6. INSERT DEFAULT SYSTEM SETTINGS
-- ================================================

INSERT INTO system_settings (setting_key, setting_value, category, description, is_public) VALUES
  -- General Settings
  ('site_name', '"MangaFlow"', 'general', 'Site name displayed in UI', true),
  ('site_description', '"Modern manga and webtoon reading platform"', 'general', 'Site description for SEO', true),
  ('maintenance_mode', 'false', 'general', 'Enable/disable maintenance mode', false),
  ('contact_email', '"admin@mangaflow.com"', 'general', 'Contact email for support', true),
  
  -- Content Settings
  ('auto_approve_content', 'false', 'content', 'Automatically approve new content', false),
  ('max_file_size_mb', '50', 'content', 'Maximum file upload size in MB', false),
  ('allowed_image_formats', '["jpg", "jpeg", "png", "webp"]', 'content', 'Allowed image formats', false),
  ('content_moderation_required', 'true', 'content', 'Require moderation for all content', false),
  
  -- Security Settings
  ('session_timeout_minutes', '60', 'security', 'Session timeout in minutes', false),
  ('max_login_attempts', '5', 'security', 'Max failed login attempts before lockout', false),
  ('lockout_duration_minutes', '30', 'security', 'Account lockout duration', false),
  ('enable_rate_limiting', 'true', 'security', 'Enable API rate limiting', false),
  
  -- UI Settings
  ('default_theme', '"dark"', 'ui', 'Default theme (dark/light)', true),
  ('items_per_page', '20', 'ui', 'Default items per page', true),
  ('enable_animations', 'true', 'ui', 'Enable UI animations', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ================================================
-- 7. HELPER FUNCTION: LOG USER ACTION
-- ================================================

CREATE OR REPLACE FUNCTION log_user_action(
  p_log_type VARCHAR(50),
  p_action VARCHAR(100),
  p_severity VARCHAR(20),
  p_user_id UUID,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO system_logs (log_type, action, severity, user_id, description, metadata)
  VALUES (p_log_type, p_action, p_severity, p_user_id, p_description, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. TRIGGER: UPDATE last_login_at ON AUTH
-- ================================================

-- This would typically be handled by auth triggers, but we'll add manual update capability

-- ================================================
-- 9. VIEWS FOR ADMIN DASHBOARD
-- ================================================

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  p.id,
  p.username,
  p.email,
  p.user_role,
  p.account_status,
  p.email_verified,
  p.last_login_at,
  p.created_at,
  COALESCE(m.manga_count, 0) as manga_count,
  COALESCE(c.chapter_count, 0) as chapter_count
FROM profiles p
LEFT JOIN (
  SELECT creator_id, COUNT(*) as manga_count
  FROM mangas
  GROUP BY creator_id
) m ON p.id = m.creator_id
LEFT JOIN (
  SELECT uploader_id, COUNT(*) as chapter_count
  FROM chapters
  GROUP BY uploader_id
) c ON p.id = c.uploader_id;

-- Recent activity log view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  sl.id,
  sl.log_type,
  sl.action,
  sl.severity,
  sl.description,
  sl.created_at,
  p.username as user_username,
  p.email as user_email
FROM system_logs sl
LEFT JOIN profiles p ON sl.user_id = p.id
ORDER BY sl.created_at DESC
LIMIT 100;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
