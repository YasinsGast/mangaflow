import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MouseParallaxProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  rotateIntensity?: number;
}

export default function MouseParallax({ 
  children, 
  className = '', 
  intensity = 20, 
  rotateIntensity = 5 
}: MouseParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { 
    stiffness: 100, 
    damping: 25,
    mass: 0.5
  });
  const springY = useSpring(mouseY, { 
    stiffness: 100, 
    damping: 25,
    mass: 0.5
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) / rect.width;
      const deltaY = (e.clientY - centerY) / rect.height;
      
      mouseX.set(deltaX * intensity);
      mouseY.set(deltaY * intensity);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      mouseX.set(0);
      mouseY.set(0);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY, intensity]);

  return (
    <div ref={containerRef} className={className}>
      <motion.div
        style={{
          x: springX,
          y: springY,
          rotateX: isHovered ? springY.get() * -rotateIntensity * 0.1 : 0,
          rotateY: isHovered ? springX.get() * rotateIntensity * 0.1 : 0,
        }}
        transition={{
          rotateX: { type: "spring", stiffness: 100, damping: 20 },
          rotateY: { type: "spring", stiffness: 100, damping: 20 },
        }}
        className="transform-gpu"
      >
        {children}
      </motion.div>
    </div>
  );
}