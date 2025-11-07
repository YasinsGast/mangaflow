'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-md bg-background-elevated/60 backdrop-blur-xs px-4 py-3 text-body',
          'border border-border-subtle',
          'text-text-primary placeholder:text-text-tertiary',
          'focus-visible:outline-none focus-visible:border-accent-primary focus-visible:ring-3 focus-visible:ring-accent-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'transition-all duration-fast',
          error && 'border-semantic-error bg-semantic-error/10 focus-visible:border-semantic-error focus-visible:ring-semantic-error/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
