-- MangaFlow Bölüm Sayısı Senkronizasyon Düzeltmesi
-- Bu SQL komutu mangas tablosundaki total_chapters alanını gerçek bölüm sayısı ile günceller

-- 1. Önce mevcut durumu kontrol edelim
SELECT 
  m.id,
  m.title,
  m.total_chapters as stored_chapter_count,
  COUNT(c.id) as actual_chapter_count,
  CASE 
    WHEN m.total_chapters = COUNT(c.id) THEN 'EŞİT'
    ELSE 'UYUMSUZ'
  END as sync_status
FROM mangas m
LEFT JOIN chapters c ON m.id = c.manga_id AND c.approval_status = 'approved'
GROUP BY m.id, m.title, m.total_chapters
ORDER BY sync_status DESC, m.title;

-- 2. total_chapters alanını gerçek bölüm sayısı ile güncelle
UPDATE mangas
SET total_chapters = (
  SELECT COUNT(*)
  FROM chapters 
  WHERE chapters.manga_id = mangas.id 
    AND chapters.approval_status = 'approved'
),
updated_at = NOW()
WHERE id IN (
  SELECT manga_id
  FROM chapters
  WHERE approval_status = 'approved'
  GROUP BY manga_id
);

-- 3. Güncellenmiş durumu kontrol edelim
SELECT 
  m.id,
  m.title,
  m.total_chapters as updated_chapter_count,
  COUNT(c.id) as actual_chapter_count,
  CASE 
    WHEN m.total_chapters = COUNT(c.id) THEN '✅ EŞİT'
    ELSE '❌ UYUMSUZ'
  END as sync_status
FROM mangas m
LEFT JOIN chapters c ON m.id = c.manga_id AND c.approval_status = 'approved'
GROUP BY m.id, m.title, m.total_chapters
ORDER BY sync_status, m.title;

-- 4. Hangi mangaların hiç bölümü yok kontrolü
SELECT 
  m.id,
  m.title,
  m.total_chapters,
  COUNT(c.id) as actual_chapter_count
FROM mangas m
LEFT JOIN chapters c ON m.id = c.manga_id AND c.approval_status = 'approved'
GROUP BY m.id, m.title, m.total_chapters
HAVING COUNT(c.id) = 0
ORDER BY m.title;