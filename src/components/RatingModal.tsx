import React, { useState } from 'react';
import { X, Star, Heart, MessageCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { useRating } from '@/hooks/useRating';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mangaId: string;
  mangaTitle: string;
  mangaCover?: string;
  currentRating?: number;
  onRatingChange?: (rating: number) => void;
}

export function RatingModal({
  isOpen,
  onClose,
  mangaId,
  mangaTitle,
  mangaCover,
  currentRating = 0,
  onRatingChange
}: RatingModalProps) {
  const { rateManga, deleteRating, isLoading } = useRating();
  const [rating, setRating] = useState(currentRating);
  const [reviewText, setReviewText] = useState('');
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Lütfen bir puan seçin');
      return;
    }

    const success = await rateManga(
      mangaId,
      rating,
      reviewText.trim() || undefined,
      isRecommended || undefined
    );

    if (success) {
      onRatingChange?.(rating);
      onClose();
      // Reset form
      setReviewText('');
      setIsRecommended(null);
    }
  };

  const handleDelete = async () => {
    const success = await deleteRating(mangaId);
    if (success) {
      onRatingChange?.(0);
      onClose();
      setShowDeleteConfirm(false);
    }
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return 'Puanınızı seçin';
    if (rating >= 9) return 'Efsane - Bu manga harika!';
    if (rating >= 8) return 'Mükemmel - Kesinlikle okuyun!';
    if (rating >= 7) return 'Çok İyi - Tavsiye ederim';
    if (rating >= 6) return 'İyi - Zevkle okudum';
    if (rating >= 5) return 'Orta - İdare eder';
    if (rating >= 4) return 'Zayıf - Beklentilerimi karşılamadı';
    if (rating >= 3) return 'Kötü - Pek beğenmedim';
    if (rating >= 2) return 'Berbat - Zaman kaybı';
    return 'Rezalet - Hiç okumayın';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6) return 'text-yellow-400';
    if (rating >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            {mangaCover && (
              <img
                src={mangaCover}
                alt={mangaTitle}
                className="w-12 h-12 object-cover rounded-lg"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">Puanla</h3>
              <p className="text-sm text-gray-400 truncate max-w-48">{mangaTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div className="text-center space-y-3">
            <StarRating
              value={rating}
              onChange={setRating}
              size="lg"
              showValue={false}
              showLabel={false}
              className="justify-center"
            />
            <div className="space-y-1">
              <p className={cn('text-lg font-medium', getRatingColor(rating))}>
                {rating > 0 ? `${rating}/10` : ''}
              </p>
              <p className="text-sm text-gray-400">
                {getRatingText(rating)}
              </p>
            </div>
          </div>

          {/* Recommendation */}
          {rating > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-300">Bu mangayı tavsiye eder misiniz?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsRecommended(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all',
                    isRecommended === true
                      ? 'bg-green-600/20 border-green-500 text-green-400'
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-green-500/50'
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Evet
                </button>
                <button
                  onClick={() => setIsRecommended(false)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-all',
                    isRecommended === false
                      ? 'bg-red-600/20 border-red-500 text-red-400'
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-red-500/50'
                  )}
                >
                  <X className="w-4 h-4" />
                  Hayır
                </button>
              </div>
            </div>
          )}

          {/* Review Text */}
          {rating > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-300">Yorumunuz (isteğe bağlı)</p>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Bu manga hakkında düşüncelerinizi paylaşın..."
                className="w-full h-24 bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {reviewText.length}/500
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 border-t border-gray-700/50">
          {currentRating > 0 && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-400 hover:bg-red-600/10 border border-red-600/30 rounded-lg transition-colors"
            >
              Puanı Sil
            </button>
          )}
          
          {showDeleteConfirm ? (
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:bg-gray-800 border border-gray-600 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Siliniyor...' : 'Onayla'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-1">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:bg-gray-800 border border-gray-600 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || rating === 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Kaydediliyor...' : currentRating > 0 ? 'Güncelle' : 'Puanla'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}