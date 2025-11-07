import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function StarRating({
  value = 0,
  onChange,
  maxRating = 10,
  size = 'md',
  readonly = false,
  showValue = true,
  showLabel = true,
  className
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const displayRating = isHovering ? hoverRating : value;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const handleStarClick = (rating: number) => {
    if (readonly || !onChange) return;
    onChange(rating);
  };

  const handleStarHover = (rating: number) => {
    if (readonly) return;
    setHoverRating(rating);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverRating(0);
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return 'Puanlanmamış';
    if (rating >= 9) return 'Efsane';
    if (rating >= 8) return 'Mükemmel';
    if (rating >= 7) return 'Çok İyi';
    if (rating >= 6) return 'İyi';
    if (rating >= 5) return 'Orta';
    if (rating >= 4) return 'Zayıf';
    if (rating >= 3) return 'Kötü';
    if (rating >= 2) return 'Berbat';
    return 'Rezalet';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6) return 'text-yellow-400';
    if (rating >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Stars */}
      <div 
        className="flex items-center gap-1"
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxRating }, (_, index) => {
          const starRating = index + 1;
          const isFilled = starRating <= displayRating;
          const isHalf = !isFilled && starRating - 0.5 <= displayRating;

          return (
            <button
              key={index}
              type="button"
              className={cn(
                'relative transition-all duration-200',
                readonly 
                  ? 'cursor-default' 
                  : 'cursor-pointer hover:scale-110 active:scale-95'
              )}
              onClick={() => handleStarClick(starRating)}
              onMouseEnter={() => handleStarHover(starRating)}
              disabled={readonly}
            >
              <Star
                className={cn(
                  getSizeClasses(),
                  'transition-all duration-200',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                    : isHalf
                    ? 'fill-yellow-400/50 text-yellow-400/50'
                    : 'fill-transparent text-gray-400 hover:text-yellow-400/70'
                )}
              />
              
              {/* Glow effect for filled stars */}
              {isFilled && !readonly && (
                <div className="absolute inset-0 -z-10">
                  <Star
                    className={cn(
                      getSizeClasses(),
                      'fill-yellow-400/30 text-yellow-400/30 blur-sm'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rating Value */}
      {showValue && (
        <span className={cn(
          getTextSizeClasses(),
          'font-medium tabular-nums',
          getRatingColor(displayRating)
        )}>
          {displayRating.toFixed(1)}/10
        </span>
      )}

      {/* Rating Label */}
      {showLabel && !readonly && isHovering && (
        <span className={cn(
          getTextSizeClasses(),
          'font-medium transition-colors duration-200',
          getRatingColor(hoverRating)
        )}>
          {getRatingText(hoverRating)}
        </span>
      )}

      {/* Static Label for readonly */}
      {showLabel && readonly && displayRating > 0 && (
        <span className={cn(
          getTextSizeClasses(),
          'text-gray-400 font-medium'
        )}>
          {getRatingText(displayRating)}
        </span>
      )}
    </div>
  );
}

// Compact star rating for lists and cards
export function CompactStarRating({
  value = 0,
  maxRating = 10,
  showCount,
  className
}: {
  value?: number;
  maxRating?: number;
  showCount?: number;
  className?: string;
}) {
  const filledStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  const emptyStars = maxRating - filledStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Filled stars */}
      {Array.from({ length: filledStars }, (_, i) => (
        <Star key={`filled-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="w-4 h-4 fill-transparent text-gray-400" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 fill-transparent text-gray-400" />
      ))}
      
      {/* Rating value */}
      <span className="text-sm font-medium text-gray-300 ml-1">
        {value.toFixed(1)}
      </span>
      
      {/* Rating count */}
      {showCount !== undefined && (
        <span className="text-xs text-gray-500 ml-1">
          ({showCount.toLocaleString('tr-TR')})
        </span>
      )}
    </div>
  );
}