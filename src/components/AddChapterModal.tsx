import { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2, Eye, ArrowUp, ArrowDown, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import toast from 'react-hot-toast';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  manga: {
    id: string;
    title: string;
  };
  onChapterAdded: () => void;
}

interface PageFile {
  id: string;
  file: File;
  preview: string;
}

export default function AddChapterModal({
  isOpen,
  onClose,
  manga,
  onChapterAdded
}: AddChapterModalProps) {
  const { user } = useAuth();
  const { canCreateContent, isAdmin, loading: roleLoading } = useRoleCheck();
  const [step, setStep] = useState(1);
  const [chapterData, setChapterData] = useState({
    chapterNumber: '',
    title: '',
  });
  const [pages, setPages] = useState<PageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingChapters, setExistingChapters] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingChapters();
    }
  }, [isOpen, manga.id]);

  const fetchExistingChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('chapter_number')
        .eq('manga_id', manga.id)
        .order('chapter_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastChapter = data[0];
        setChapterData(prev => ({
          ...prev,
          chapterNumber: (lastChapter.chapter_number + 1).toString()
        }));
      } else {
        setChapterData(prev => ({
          ...prev,
          chapterNumber: '1'
        }));
      }
      
      setExistingChapters(data || []);
    } catch (error) {
      console.error('Mevcut bölümler yüklenirken hata:', error);
    }
  };

  const handlePagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPages: PageFile[] = files.map(file => ({
      id: Date.now() + Math.random().toString(),
      file,
      preview: URL.createObjectURL(file)
    }));
    setPages([...pages, ...newPages]);
  };

  const removePage = (id: string) => {
    setPages(pages.filter(page => page.id !== id));
  };

  const movePageUp = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
    setPages(newPages);
  };

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    setPages(newPages);
  };

  const handleSubmit = async () => {
    setUploading(true);

    try {
      // Kullanıcının bu manga'nın sahibi olup olmadığını kontrol et
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Kullanıcı girişi gerekli');

      const { data: mangaData, error: mangaError } = await supabase
        .from('mangas')
        .select('fansub_id, creator_id')
        .eq('id', manga.id)
        .single();

      if (mangaError) throw new Error('Manga bilgileri alınamadı');

      // Kullanıcının yetkisini kontrol et
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.user.id)
        .single();

      const userRole = profileData?.user_role;
      const isAdmin = userRole === 'admin';
      const isModerator = userRole === 'moderator';
      const isOwner = mangaData.fansub_id === user.user.id || mangaData.creator_id === user.user.id;

      if (!isAdmin && !isModerator && !isOwner) {
        throw new Error('Bu manga\'ya bölüm ekleme yetkiniz yok. Sadece kendi mangalarınıza bölüm ekleyebilirsiniz.');
      }

      // Upload pages to storage
      const pageUrls: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const pageFile = pages[i];
        const pagePath = `manga-pages/${manga.id}/chapter_${chapterData.chapterNumber}_page_${i + 1}_${Date.now()}.${pageFile.file.name.split('.').pop()}`;
        
        const { error: pageError } = await supabase.storage
          .from('manga-pages')
          .upload(pagePath, pageFile.file);

        if (pageError) throw pageError;

        const { data: { publicUrl } } = supabase.storage
          .from('manga-pages')
          .getPublicUrl(pagePath);

        pageUrls.push(publicUrl);
      }

      // Önce pending_chapters tablosuna ekle
      const { data, error } = await supabase
        .from('pending_chapters')
        .insert({
          manga_id: manga.id,
          chapter_number: parseInt(chapterData.chapterNumber),
          title: chapterData.title || `Bölüm ${chapterData.chapterNumber}`,
          created_by: user.user.id,
          content: {
            pages: pageUrls,
            pageCount: pages.length
          }
        })
        .select()
        .single();

      if (error) throw error;

      alert('Bölüm başarıyla eklendi ve admin onayına gönderildi!');
      
      // Reset form
      setChapterData({ chapterNumber: '', title: '' });
      setPages([]);
      setStep(1);
      onChapterAdded();
      onClose();
    } catch (error: any) {
      console.error('Bölüm eklenirken hata:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🔒 GÜVENLİK KONTROLÜ: Yetki yoksa modal açma
  if (!isOpen) return null;
  
  if (roleLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span className="text-gray-800">Yetki kontrol ediliyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!canCreateContent()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <X className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-bold text-gray-800">Yetkisiz Erişim</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Bölüm ekleme yetkiniz bulunmuyor. Bu işlemi yapabilmek için fansub, moderator veya admin yetkisine sahip olmanız gerekiyor.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Bölüm Ekle</h2>
            <p className="text-gray-400 text-sm">{manga.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-purple-600' : 'bg-gray-600'}`}>
              <span className="font-semibold text-sm">1</span>
            </div>
            <div className={`h-1 w-16 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-600'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-purple-600' : 'bg-gray-600'}`}>
              <span className="font-semibold text-sm">2</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bölüm Numarası *
                </label>
                <input
                  type="number"
                  min="1"
                  value={chapterData.chapterNumber}
                  onChange={(e) => setChapterData({ ...chapterData, chapterNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Bölüm numarası"
                />
                {existingChapters.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Son bölüm: {existingChapters[0]?.chapter_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bölüm Başlığı (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={chapterData.title}
                  onChange={(e) => setChapterData({ ...chapterData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Bölüm başlığı"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!chapterData.chapterNumber}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
                >
                  Devam Et
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-300 mb-2">Sayfaları yükleyin</p>
                    <p className="text-sm text-gray-400">Birden fazla dosya seçebilirsiniz</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handlePagesUpload}
                  />
                </label>
              </div>

              {pages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-400">{pages.length} sayfa yüklendi</p>
                    <button
                      onClick={() => setPages([])}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Tümünü Temizle
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pages.map((pageFile, index) => (
                      <div key={pageFile.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg group hover:bg-gray-600 transition-colors">
                        {/* Sıralama Numarası */}
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        
                        {/* Sayfa Önizleme */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-20 bg-gray-600 rounded overflow-hidden">
                            <img 
                              src={pageFile.preview} 
                              alt={`Sayfa ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        
                        {/* Sayfa Bilgisi */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {pageFile.file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(pageFile.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        
                        {/* Kontrol Butonları */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => movePageUp(index)}
                            disabled={index === 0}
                            className="p-1.5 bg-gray-600 hover:bg-blue-600 disabled:bg-gray-700 disabled:opacity-50 rounded text-white transition-colors"
                            title="Yukarı taşı"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          
                          <button
                            onClick={() => movePageDown(index)}
                            disabled={index === pages.length - 1}
                            className="p-1.5 bg-gray-600 hover:bg-blue-600 disabled:bg-gray-700 disabled:opacity-50 rounded text-white transition-colors"
                            title="Aşağı taşı"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          
                          <button
                            onClick={() => removePage(pageFile.id)}
                            className="p-1.5 bg-gray-600 hover:bg-red-600 rounded text-white transition-colors"
                            title="Sayfayı sil"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {pages.length > 1 && (
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-300">
                        <GripVertical className="h-4 w-4" />
                        <p className="text-sm font-medium">
                          Sıralama: {pages.length > 1 ? '↑↓ butonları ile sayfaları sıralayabilirsiniz' : 'Tek sayfa'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors"
                >
                  Geri
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={pages.length === 0 || uploading}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    'Bölüm Ekle'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}