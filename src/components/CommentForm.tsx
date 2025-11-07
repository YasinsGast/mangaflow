import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentFormProps {
  mangaId: string;
  parentId?: string | null;
  onSubmit: (content: string, isSpoiler: boolean) => Promise<boolean>;
  onCancel?: () => void;
  submitting?: boolean;
  placeholder?: string;
  buttonText?: string;
}

export default function CommentForm({
  mangaId,
  parentId = null,
  onSubmit,
  onCancel,
  submitting = false,
  placeholder = 'Yorumunuzu yazın...',
  buttonText = 'Gönder',
}: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 500) {
      setContent(text);
      setCharCount(text.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    if (content.trim().length === 0) {
      return;
    }

    const success = await onSubmit(content, isSpoiler);
    if (success) {
      setContent('');
      setIsSpoiler(false);
      setCharCount(0);
      if (onCancel) onCancel();
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30">
        <p className="text-gray-400 text-center">
          Yorum yapmak için <a href="#" className="text-blue-400 hover:text-blue-300">giriş yapın</a>
        </p>
      </div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30"
    >
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder={placeholder}
          rows={parentId ? 3 : 4}
          disabled={submitting}
          className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none disabled:opacity-50"
        />
        
        {/* Character count */}
        <div className="absolute bottom-3 right-3 text-xs">
          <span className={`${charCount > 450 ? 'text-yellow-400' : 'text-gray-500'}`}>
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Spoiler checkbox and submit */}
      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 rounded border-gray-600 bg-gray-900/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 disabled:opacity-50"
          />
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Spoiler içerir
          </span>
        </label>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
          )}
          
          <button
            type="submit"
            disabled={submitting || content.trim().length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {buttonText}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
