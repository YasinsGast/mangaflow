import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import toast from 'react-hot-toast';
import type { Chapter } from '@/lib/supabase';

interface DeleteChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  onDelete: (chapterId: string) => void;
}

export default function DeleteChapterModal({ isOpen, onClose, chapter, onDelete }: DeleteChapterModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { canDeleteContent, isAdmin, loading: roleLoading } = useRoleCheck();

  const expectedConfirmText = `Bölüm ${chapter?.chapter_number}`;
  const isConfirmValid = confirmText === expectedConfirmText;

  const handleDelete = async () => {
    if (!chapter || !isConfirmValid) return;

    setIsDeleting(true);

    try {
      // Bölümü sil
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapter.id);

      if (error) throw error;

      onDelete(chapter.id);
      onClose();
    } catch (error: any) {
      console.error('Bölüm silme hatası:', error);
      alert(`Bölüm silme hatası: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔒 GÜVENLİK KONTROLÜ: Sadece ADMIN silebilir
  if (!isOpen || !chapter) return null;
  
  if (roleLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
            <span className="text-gray-800">Yetki kontrol ediliyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <X className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-bold text-gray-800">Yetkisiz Erişim</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Bölüm silme işlemi sadece Admin yetkisine sahip kullanıcılar tarafından yapılabilir.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-900 rounded-2xl border border-red-500/20 w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-slate-700">
            <div className="p-2 bg-red-500/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bölüm Sil</h2>
              <p className="text-slate-400 text-sm">Bu işlem geri alınamaz</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="ml-auto p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-white mb-4">
              <p className="mb-2">
                <strong>Bölüm {chapter.chapter_number}</strong> adlı bölümü silmek istediğinizden emin misiniz?
              </p>
              {chapter.title && (
                <p className="text-slate-300 text-sm mb-4">
                  Başlık: "{chapter.title}"
                </p>
              )}
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="text-red-300 text-sm">
                  <p className="font-semibold mb-1">Dikkat!</p>
                  <ul className="space-y-1 text-red-200">
                    <li>• Bu bölüm kalıcı olarak silinecektir</li>
                    <li>• Bölüm sayfaları da silinecektir</li>
                    <li>• Bu işlem geri alınamaz</li>
                    <li>• Okuyucular bu bölüme erişemeyecektir</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Onaylamak için <strong>{expectedConfirmText}</strong> yazın:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Onay metnini girin..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
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
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Kalıcı Olarak Sil
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}