import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Book, Maximize, ArrowUp, Lock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useBookmark } from '@/hooks/useBookmark';
import { useAuth } from '@/contexts/AuthContext';
import { useReadingPreferences } from '@/contexts/ReadingPreferencesContext';
import toast from 'react-hot-toast';

export default function ReaderPage() {
  const { slug, chapter: chapterNum } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { saveBookmark, isAuthenticated } = useBookmark();
  const { preferences, updatePreference } = useReadingPreferences();
  
  const [manga, setManga] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState(preferences.defaultReadingMode);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isPendingChapter, setIsPendingChapter] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showModeToggle, setShowModeToggle] = useState(false);
  
  // Refs for scroll tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Debounce timer for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update preferences when reading mode changes
  useEffect(() => {
    updatePreference('defaultReadingMode', readingMode);
  }, [readingMode, updatePreference]);

  // Load saved reading position
  useEffect(() => {
    if (manga?.id && chapter?.chapter_number) {
      const savedPosition = localStorage.getItem(`reading_position_${manga.id}_${chapter.chapter_number}`);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        setCurrentPage(position);
        
        // Scroll to saved position for webtoon mode
        if (readingMode === 'webtoon' && containerRef.current) {
          setTimeout(() => {
            const pageElement = document.querySelector(`[data-page="${position}"]`);
            if (pageElement) {
              pageElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 500);
        }
      }
    }
  }, [manga?.id, chapter?.chapter_number, readingMode]);

  // Track reading progress
  useEffect(() => {
    const updateProgress = () => {
      if (pages.length === 0) return;

      let progress = 0;
      
      if (readingMode === 'webtoon') {
        // Calculate scroll-based progress for webtoon mode
        if (containerRef.current) {
          const container = containerRef.current;
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight - container.clientHeight;
          progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        }
      } else {
        // Calculate page-based progress for manga mode
        progress = pages.length > 0 ? ((currentPage + 1) / pages.length) * 100 : 0;
      }

      setReadingProgress(Math.min(100, Math.max(0, progress)));
      
      // Save reading position
      if (manga?.id && chapter?.chapter_number) {
        const positionKey = `reading_position_${manga.id}_${chapter.chapter_number}`;
        if (readingMode === 'webtoon') {
          // For webtoon, save current visible page
          const visiblePage = Math.floor((progress / 100) * pages.length);
          localStorage.setItem(positionKey, visiblePage.toString());
        } else {
          // For manga mode, save current page
          localStorage.setItem(positionKey, currentPage.toString());
        }
      }
    };

    updateProgress();

    // Add scroll listener for webtoon mode
    if (readingMode === 'webtoon' && containerRef.current) {
      const container = containerRef.current;
      container.addEventListener('scroll', updateProgress);
      return () => container.removeEventListener('scroll', updateProgress);
    }
  }, [currentPage, pages.length, readingMode, manga?.id, chapter?.chapter_number]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (readingMode === 'manga') {
            goToPreviousPage();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (readingMode === 'manga') {
            goToNextPage();
          }
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          setReadingMode(readingMode === 'webtoon' ? 'manga' : 'webtoon');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setShowControls(!showControls);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [readingMode, showControls, currentPage, pages.length]);

  useEffect(() => {
    async function fetchChapterData() {
      if (!slug || !chapterNum) return;

      setLoading(true);

      // Fetch manga
      const { data: mangaData } = await supabase
        .from('mangas')
        .select('*')
        .eq('slug', slug)
        .single();

      if (mangaData) {
        setManga(mangaData);

        // Fetch all chapters for navigation (both approved and pending)
        const [approvedChaptersData, pendingChaptersData] = await Promise.all([
          supabase
            .from('chapters')
            .select('*')
            .eq('manga_id', mangaData.id)
            .order('chapter_number', { ascending: true }),
          supabase
            .from('pending_chapters')
            .select('*')
            .eq('manga_id', mangaData.id)
            .eq('status', 'pending')
            .order('chapter_number', { ascending: true })
        ]);

        // Combine both approved and pending chapters for navigation
        const allChaptersCombined = [
          ...(approvedChaptersData.data || []),
          ...(pendingChaptersData.data || [])
        ].sort((a, b) => a.chapter_number - b.chapter_number);
        
        setAllChapters(allChaptersCombined);

        // Fetch current chapter from both tables
        let chapterData = null;
        let currentIsPending = false;

        // First try to find in approved chapters
        const { data: approvedChapterData } = await supabase
          .from('chapters')
          .select('*')
          .eq('manga_id', mangaData.id)
          .eq('chapter_number', parseInt(chapterNum))
          .single();

        if (approvedChapterData) {
          chapterData = approvedChapterData;
          currentIsPending = false;
        } else {
          // If not found in approved chapters, try pending chapters
          const { data: pendingChapterData } = await supabase
            .from('pending_chapters')
            .select('*')
            .eq('manga_id', mangaData.id)
            .eq('chapter_number', parseInt(chapterNum))
            .eq('status', 'pending')
            .single();

          if (pendingChapterData) {
            chapterData = pendingChapterData;
            currentIsPending = true;
          }
        }

        console.log('[ReaderPage] Chapter fetch result:', {
          chapterData: !!chapterData,
          isPending: currentIsPending,
          chapterNumber: chapterNum,
          chapterId: chapterData?.id
        });

        if (chapterData) {
          setChapter(chapterData);
          setIsPendingChapter(currentIsPending); // Update state sync with logic

          // Handle pages based on chapter type
          if (currentIsPending) {
            // For pending chapters, pages are stored in the content JSON field
            console.log('[ReaderPage] Pending chapter found, processing pages from content:', chapterData.content);
            if (chapterData.content && chapterData.content.pages) {
              const pagesFromContent = chapterData.content.pages.map((pageUrl: string, index: number) => ({
                id: `pending-page-${index}`,
                page_url: pageUrl,
                page_number: index + 1,
                chapter_id: chapterData.id
              }));
              console.log('[ReaderPage] Generated pages from pending content:', pagesFromContent);
              setPages(pagesFromContent);
              
              // URL'den page parametresi varsa o sayfadan başlat
              const pageParam = searchParams.get('page');
              if (pageParam) {
                const pageNumber = parseInt(pageParam);
                if (pageNumber > 0 && pageNumber <= pagesFromContent.length) {
                  setCurrentPage(pageNumber - 1);
                }
              }
            } else {
              console.log('[ReaderPage] No content or pages found in pending chapter');
              console.log('[ReaderPage] Chapter data structure:', {
                hasContent: !!chapterData.content,
                content: chapterData.content,
                chapterKeys: Object.keys(chapterData)
              });
            }
          } else {
            // For approved chapters, first check page_urls field
            console.log('[ReaderPage] Approved chapter found, checking page_urls:', chapterData.page_urls);
            
            let pagesData = [];
            
            // If page_urls exists and has content, use it
            if (chapterData.page_urls && chapterData.page_urls.length > 0) {
              console.log('[ReaderPage] Using page_urls from chapter data');
              pagesData = chapterData.page_urls.map((pageUrl: string, index: number) => ({
                id: `chapter-page-${index}`,
                page_url: pageUrl,
                page_number: index + 1,
                chapter_id: chapterData.id
              }));
            } else {
              // Fallback to chapter_pages table if no page_urls
              console.log('[ReaderPage] No page_urls found, falling back to chapter_pages table');
              const { data: dbPagesData } = await supabase
                .from('chapter_pages')
                .select('*')
                .eq('chapter_id', chapterData.id)
                .order('page_number', { ascending: true });

              if (dbPagesData && dbPagesData.length > 0) {
                console.log('[ReaderPage] Fetched pages from database:', dbPagesData);
                pagesData = dbPagesData;
              }
            }

            if (pagesData.length > 0) {
              console.log('[ReaderPage] Pages loaded successfully:', pagesData);
              setPages(pagesData);
              
              // URL'den page parametresi varsa o sayfadan başlat
              const pageParam = searchParams.get('page');
              if (pageParam) {
                const pageNumber = parseInt(pageParam);
                if (pageNumber > 0 && pageNumber <= pagesData.length) {
                  setCurrentPage(pageNumber - 1);
                }
              }
            } else {
              console.log('[ReaderPage] No pages found in either page_urls or chapter_pages');
            }
          }
        } else {
          console.log('[ReaderPage] No chapter data found');
          console.log('[ReaderPage] Search details:', {
            mangaId: mangaData.id,
            chapterNumber: parseInt(chapterNum)
          });
        }
      }

      setLoading(false);
    }

    fetchChapterData();
  }, [slug, chapterNum, searchParams]);

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // Go to next chapter
      const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === chapter?.chapter_number);
      if (currentChapterIndex < allChapters.length - 1) {
        const nextChapter = allChapters[currentChapterIndex + 1];
        navigate(`/read/${slug}/${nextChapter.chapter_number}`);
      }
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else {
      // Go to previous chapter
      const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === chapter?.chapter_number);
      if (currentChapterIndex > 0) {
        const prevChapter = allChapters[currentChapterIndex - 1];
        navigate(`/read/${slug}/${prevChapter.chapter_number}`);
      }
    }
  };

  const nextPage = goToNextPage;
  const prevPage = goToPreviousPage;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!preferences.keyboardShortcutsEnabled) return;
      
      if (readingMode === 'manga') {
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === 'ArrowRight') nextPage();
      }
      if (e.key === 'Escape') navigate(`/manga/${slug}`);
      
      // Additional keyboard shortcuts
      if (e.key === 'm' || e.key === 'M') {
        setReadingMode(readingMode === 'manga' ? 'webtoon' : 'manga');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pages, readingMode, slug, preferences.keyboardShortcutsEnabled]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  // Auto-save bookmark when page changes (debounced)
  useEffect(() => {
    console.log('[ReaderPage] Auto-save effect tetiklendi', {
      manga: manga?.id,
      chapter: chapter?.id,
      currentPage,
      isAuthenticated
    });

    if (!manga || !chapter || !isAuthenticated) {
      console.log('[ReaderPage] Auto-save atlandı - eksik veri veya giriş yapılmamış');
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout (2 seconds debounce)
    saveTimeoutRef.current = setTimeout(async () => {
      console.log('[ReaderPage] Bookmark kaydediliyor...', {
        manga_id: manga.id,
        chapter_id: chapter.id,
        page_number: currentPage + 1
      });

      const success = await saveBookmark({
        manga_id: manga.id,
        chapter_id: chapter.id,
        page_number: currentPage + 1,
      });

      console.log('[ReaderPage] Bookmark kaydetme sonucu:', success);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentPage, manga, chapter, isAuthenticated, saveBookmark]);

  // Scroll position tracking for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowScrollTop(scrollPosition > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === parseInt(chapterNum || '0'));
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < allChapters.length - 1;

  const goToPrevChapter = () => {
    if (hasPrevChapter) {
      const prevChapter = allChapters[currentChapterIndex - 1];
      navigate(`/read/${slug}/${prevChapter.chapter_number}`);
      setCurrentPage(0); // Reset to first page
    }
  };

  const goToNextChapter = () => {
    if (hasNextChapter) {
      const nextChapter = allChapters[currentChapterIndex + 1];
      navigate(`/read/${slug}/${nextChapter.chapter_number}`);
      setCurrentPage(0); // Reset to first page
    }
  };

  // Pending chapter uyarısı göster (use current state)
  const showPendingWarning = isPendingChapter;

  const progress = pages.length > 0 ? ((currentPage + 1) / pages.length) * 100 : 0;

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6">
            <Lock className="h-16 w-16 mx-auto text-text-secondary mb-4" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">Üye Olmadan Bölüm Okunamaz</h1>
            <p className="text-text-secondary mb-6">
              Manga bölümlerini okuyabilmek ve bookmark kaydedebilmek için üye olmanız gerekiyor. 
              Ücretsiz hesap oluşturun ve tüm içeriklere erişin!
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
              size="lg"
            >
              🔓 Giriş Yap
            </Button>
            <Button 
              variant="secondary"
              onClick={() => navigate('/register')} 
              className="w-full"
              size="lg"
            >
              ✨ Üye Ol (Ücretsiz)
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate(`/manga/${slug}`)} 
              className="w-full"
            >
              ← Manga Detayına Dön
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-text-secondary">Yükleniyor...</div>
      </div>
    );
  }

  if (!manga || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Bölüm bulunamadı</p>
          <p className="text-text-secondary mb-6 text-sm">
            Bu bölüm henüz yayınlanmamış veya silinmiş olabilir.
          </p>
          <Button onClick={() => navigate(`/manga/${slug}`)}>Manga Detayına Dön</Button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Sayfa bulunamadı</p>
          <p className="text-text-secondary mb-6 text-sm">
            {isPendingChapter 
              ? 'Bu pending bölümde sayfa içeriği bulunmuyor.'
              : 'Bu bölüm için sayfa bilgisi bulunmuyor.'}
          </p>
          <Button onClick={() => navigate(`/manga/${slug}`)}>Manga Detayına Dön</Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative min-h-screen bg-black"
      onMouseMove={() => setShowControls(true)}
      onClick={() => setShowControls(true)}
    >
      {/* Pending Chapter Warning */}
      {showPendingWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-1 left-0 right-0 z-50 p-2 bg-yellow-500/20 border-b border-yellow-500/30"
        >
          <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm">
            <Book className="h-4 w-4" />
            <span>⚠️ Bu bölüm henüz onay bekliyor ve geçici olarak görüntüleniyor</span>
          </div>
        </motion.div>
      )}

      {/* Progress Bar */}
      <div className={`fixed top-0 left-0 right-0 h-1 bg-bg-elevated z-50 ${showPendingWarning ? 'mt-8' : ''}`}>
        <motion.div
          className="h-full bg-accent-primary"
          style={{ width: `${readingProgress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Top Controls */}
      <motion.div
        className={`fixed left-0 right-0 z-40 p-4 ${showPendingWarning ? 'mt-8' : 'top-0'}`}
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/manga/${slug}`)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevChapter}
                disabled={!hasPrevChapter}
                title="Önceki Bölüm"
              >
                <ChevronLeft className="h-5 w-5" />
                Önceki Bölüm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextChapter}
                disabled={!hasNextChapter}
                title="Sonraki Bölüm"
              >
                Sonraki Bölüm
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <h2 className="font-semibold">{manga.title}</h2>
              <p className="text-sm text-text-secondary">
                Bölüm {chapter.chapter_number} - Sayfa {currentPage + 1}/{pages.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reading Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-elevated border border-border-primary">
              <Button
                variant={readingMode === 'webtoon' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setReadingMode('webtoon')}
                className="text-xs px-3 py-1"
              >
                <Book className="h-3 w-3 mr-1" />
                Webtoon
              </Button>
              <Button
                variant={readingMode === 'manga' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setReadingMode('manga')}
                className="text-xs px-3 py-1"
              >
                <Maximize className="h-3 w-3 mr-1" />
                Sayfa
              </Button>
            </div>

            {/* Progress & Page Info */}
            <div className="px-3 py-1 rounded-lg bg-bg-elevated border border-border-primary text-xs">
              <span className="text-text-secondary">
                {readingMode === 'webtoon' 
                  ? `${Math.round(readingProgress)}%` 
                  : `${currentPage + 1}/${pages.length}`
                }
              </span>
            </div>

            {/* Settings Toggle */}
            <Button
              variant={showModeToggle ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowModeToggle(!showModeToggle)}
              title="Okuma Ayarları"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Reading Preferences Panel */}
      <AnimatePresence>
        {showModeToggle && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed left-4 z-30 ${showPendingWarning ? 'top-32' : 'top-24'}`}
          >
            <div className="p-4 rounded-xl backdrop-blur-md border border-border-primary" style={{
              background: 'rgba(15, 23, 42, 0.95)',
            }}>
              <h3 className="text-sm font-semibold mb-3 text-text-primary">Okuma Ayarları</h3>
              
              <div className="space-y-3">
                {/* Reading Mode */}
                <div>
                  <label className="block text-xs text-text-secondary mb-2">Okuma Modu</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReadingMode('webtoon')}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                        readingMode === 'webtoon'
                          ? 'bg-accent-primary border-accent-primary text-white'
                          : 'bg-bg-elevated border-border-primary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Book className="h-3 w-3 mr-1 inline" />
                      Dikey Kaydırma
                    </button>
                    <button
                      onClick={() => setReadingMode('manga')}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                        readingMode === 'manga'
                          ? 'bg-accent-primary border-accent-primary text-white'
                          : 'bg-bg-elevated border-border-primary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Maximize className="h-3 w-3 mr-1 inline" />
                      Sayfa Sayfa
                    </button>
                  </div>
                </div>

                {/* Progress Info */}
                <div>
                  <label className="block text-xs text-text-secondary mb-2">İlerleme</label>
                  <div className="text-xs text-text-primary">
                    {readingMode === 'webtoon' ? (
                      <span>{Math.round(readingProgress)}% tamamlandı</span>
                    ) : (
                      <span>Sayfa {currentPage + 1} / {pages.length}</span>
                    )}
                  </div>
                  <div className="mt-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-primary transition-all duration-300"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Keyboard Shortcuts Info */}
                <div>
                  <label className="block text-xs text-text-secondary mb-2">Kısayollar</label>
                  <div className="text-xs text-text-secondary space-y-1">
                    <div>← → : Sayfa gezinme (Manga modu)</div>
                    <div>W : Mod değiştir</div>
                    <div>F : Kontrolleri gizle/göster</div>
                    <div>ESC : Manga detayına dön</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Content */}
      {readingMode === 'webtoon' ? (
        // Webtoon Mode: Vertical Scroll
        <div 
          ref={containerRef}
          className={`max-w-3xl mx-auto ${showPendingWarning ? 'pt-28' : 'pt-20'} pb-0 overflow-y-auto`}
        >
          {pages.map((page, index) => (
            <div 
              key={page.id} 
              data-page={index}
              className="mb-2"
            >
              <img
                src={page.page_url}
                alt={`Sayfa ${page.page_number}`}
                className="w-full block"
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
          
          {/* Chapter Navigation for Webtoon Mode */}
          <div className="mt-8 p-6 rounded-xl backdrop-blur-md" style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={goToPrevChapter}
                disabled={!hasPrevChapter}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-xs text-slate-400">Önceki Bölüm</div>
                  {hasPrevChapter && (
                    <div className="text-sm">Bölüm {allChapters[currentChapterIndex - 1]?.chapter_number}</div>
                  )}
                </div>
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate(`/manga/${slug}`)}
                className="flex flex-col items-center"
              >
                <Book className="h-5 w-5 mb-1" />
                <span className="text-xs">Bölümler</span>
              </Button>

              <Button
                variant="secondary"
                onClick={goToNextChapter}
                disabled={!hasNextChapter}
                className="flex items-center gap-2"
              >
                <div className="text-right">
                  <div className="text-xs text-slate-400">Sonraki Bölüm</div>
                  {hasNextChapter && (
                    <div className="text-sm">Bölüm {allChapters[currentChapterIndex + 1]?.chapter_number}</div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Manga Mode: Horizontal Flip
        <div className={`flex items-center justify-center min-h-screen ${showPendingWarning ? 'pt-24' : 'pt-16'} pb-24`}>
          <img
            src={pages[currentPage]?.page_url}
            alt={`Sayfa ${currentPage + 1}`}
            className="max-h-screen max-w-full object-contain"
          />
        </div>
      )}

      {/* Bottom Controls (Manga Mode Only) */}
      {readingMode === 'manga' && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 p-6"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <Button
                variant="secondary"
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-5 w-5" />
                Önceki
              </Button>

              <div className="px-4 py-2 bg-bg-elevated/80 backdrop-blur-md rounded-lg">
                <div className="text-center">
                  <span className="text-sm font-mono">
                    {currentPage + 1} / {pages.length}
                  </span>
                  <div className="text-xs text-text-secondary mt-1">
                    {Math.round(readingProgress)}% tamamlandı
                  </div>
                  <div className="mt-1 h-0.5 bg-bg-secondary rounded-full overflow-hidden w-20">
                    <div 
                      className="h-full bg-accent-primary transition-all duration-300"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
              >
                Sonraki
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Chapter Navigation (on last page) */}
            {currentPage === pages.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                {hasPrevChapter && (
                  <Button
                    variant="ghost"
                    onClick={goToPrevChapter}
                    className="text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki Bölüm
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/manga/${slug}`)}
                  className="text-xs"
                >
                  <Book className="h-4 w-4 mr-1" />
                  Bölümler
                </Button>
                {hasNextChapter && (
                  <Button
                    variant="primary"
                    onClick={goToNextChapter}
                    className="text-xs"
                  >
                    Sonraki Bölüm
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && readingMode === 'webtoon' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-4 rounded-full backdrop-blur-md shadow-lg hover:shadow-purple-500/50 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(139, 92, 246, 0.8))',
              border: '1px solid rgba(139, 92, 246, 0.5)',
            }}
            title="Yukarı Çık"
          >
            <ArrowUp className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
