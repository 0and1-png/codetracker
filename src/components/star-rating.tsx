'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  readOnly?: boolean;
  label?: string;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 20,
  readOnly = false,
  label,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-sm text-muted-foreground mr-2 min-w-[3em]">{label}</span>}
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={cn(
              'transition-colors duration-150',
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            onClick={() => {
              if (onChange) {
                onChange(i + 1 === value ? i : i + 1);
              }
            }}
          >
            <Star
              size={size}
              className={cn(
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
