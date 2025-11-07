'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-normal rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary/30 disabled:opacity-40 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-accent-primary text-text-white hover:bg-accent-primary-hover shadow-sm hover:shadow-glow-accent-md',
      secondary: 'bg-transparent border-2 border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-text-white hover:shadow-glow-accent-sm',
      ghost: 'bg-transparent hover:bg-background-elevated/50 text-text-secondary hover:text-text-primary',
    };
    
    const sizes = {
      sm: 'h-10 px-6 text-sm',
      md: 'h-12 px-8 text-body',
      lg: 'h-14 px-10 text-body-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
