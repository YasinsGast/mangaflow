import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Trash2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Chapter } from '@/lib/supabase';
import { useRoleCheck } from '@/hooks/useRoleCheck';

interface EditChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  onUpdate: (updatedChapter: Chapter) => void;
}

export default function EditChapterModal({ isOpen, onClose, chapter, onUpdate }: EditChapterModalProps) {
  const [title, setTitle] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { canCreateContent, isAdmin } = useRoleCheck(['fansub', 'admin', 'moderator']);

  // Form reset function
  const resetForm = () => {
    setTitle(chapter?.title || '');
    setIsPremium(chapter?.is_premium || false);
    setPageUrls(chapter?.page_urls || []);
  };

  useEffect(() => {
    if (isOpen && chapter) {
      resetForm();
    }
  }, [isOpen, chapter]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !chapter) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} dosyası geçerli bir resim dosyası değil.`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} dosyası çok büyük. Maksimum 10MB olmalıdır.`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `chapter_${chapter.chapter_number}_page_${i + 1}_${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('chapter-pages')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        if (data?.path) {
          const { data: urlData } = supabase.storage
            .from('chapter-pages')
            .getPublicUrl(data.path);
          
          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
          }
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      setPageUrls(prev => [...prev, ...uploadedUrls]);
    } catch (error: any) {
      console.error('Dosya yükleme hatası:', error);
      alert(`Dosya yükleme hatası: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removePage = (index: number) => {
    setPageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!chapter) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: title || null,
          is_premium: isPremium,
          page_urls: pageUrls,
          page_count: pageUrls.length,
          approval_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', chapter.id);

      if (error) throw error;

      const updatedChapter: Chapter = {
        ...chapter,
        title: title || null,
        is_premium: isPremium,
        page_urls: pageUrls,
        page_count: pageUrls.length
      };

      onUpdate(updatedChapter);
      onClose();
      alert('Bölüm başarıyla güncellendi ve admin onayına gönderildi!');
    } catch (error: any) {
      console.error('Bölüm güncelleme hatası:', error);
      alert(`Bölüm güncelleme hatası: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !chapter) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-900 rounded-2xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white">
              Bölüm Düzenle: {chapter.chapter_number}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bölüm Başlığı (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bölüm başlığını girin..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Premium Status */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="w-5 h-5 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                />
                <label htmlFor="isPremium" className="text-slate-300">
                  Premium bölüm
                </label>
              </div>
            </div>

            {/* Page Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sayfa Ekle/Değiştir
              </label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="pageUpload"
                  disabled={isUploading}
                />
                <label htmlFor="pageUpload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300 mb-1">Sayfaları yüklemek için tıklayın</p>
                  <p className="text-slate-500 text-sm">PNG, JPG, JPEG formatları desteklenir (Max 10MB)</p>
                </label>
                
                {isUploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Yükleniyor... {Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Pages */}
            {pageUrls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Mevcut Sayfalar ({pageUrls.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                  {pageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Sayfa ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-slate-600"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removePage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </motion.button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
            <div className="text-sm text-slate-400">
              Toplam sayfa: {pageUrls.length}
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              >
                İptal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}