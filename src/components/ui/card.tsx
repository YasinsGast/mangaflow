import { motion } from 'framer-motion';
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, children, ...props }, ref) => {
    const cardVariants = {
      initial: { y: 0 },
      hover: { y: -4 },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-lg p-8',
          hover && 'transition-all duration-normal cursor-pointer',
          className
        )}
        style={{
          background: 'rgba(15, 21, 36, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        variants={cardVariants}
        initial="initial"
        whileHover={hover ? "hover" : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
