import { motion } from 'framer-motion';
import { Grid3X3, List, ArrowRight } from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'carousel';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModes = [
  { 
    id: 'grid' as ViewMode, 
    icon: Grid3X3, 
    label: 'Grid',
    description: '3D kart düzeni' 
  },
  { 
    id: 'list' as ViewMode, 
    icon: List, 
    label: 'Liste',
    description: 'Kompakt liste görünümü' 
  },
  { 
    id: 'carousel' as ViewMode, 
    icon: ArrowRight, 
    label: 'Carousel',
    description: 'Yatay kaydırma' 
  },
];

export default function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <motion.div 
      className="flex items-center gap-2 p-1 rounded-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {viewModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = viewMode === mode.id;
        
        return (
          <motion.button
            key={mode.id}
            onClick={() => onViewModeChange(mode.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all group ${
              isActive 
                ? 'text-white' 
                : 'text-blue-300 hover:text-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={mode.description}
          >
            {/* Active background */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(147, 51, 234, 0.6))',
                }}
                layoutId="activeViewMode"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            
            {/* Hover glow effect */}
            {!isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                }}
              />
            )}
            
            <motion.div 
              className="relative z-10 flex items-center gap-2"
              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm hidden sm:block">
                {mode.label}
              </span>
            </motion.div>
            
            {/* Active indicator */}
            {isActive && (
              <motion.div
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-white rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1 }}
              />
            )}
          </motion.button>
        );
      })}
      
      {/* Floating particles on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full"
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{
              y: [-5, -15, -5],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}