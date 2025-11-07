import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  depth: number;
  baseOpacity: number;
}

export default function ParticleSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.min(120, Math.floor(window.innerWidth / 15));
      
      for (let i = 0; i < particleCount; i++) {
        const depth = Math.random() * 0.8 + 0.2;
        const baseOpacity = Math.random() * 0.4 + 0.3;
        
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          size: Math.max(0.5, Math.random() * 4 + 1), // Ensure positive size
          opacity: baseOpacity,
          hue: Math.random() * 80 + 180, // Blue-purple spectrum
          depth: depth,
          baseOpacity: baseOpacity,
        });
      }
      return particles;
    };

    const updateParticles = () => {
      particlesRef.current.forEach(particle => {
        // Enhanced mouse interaction with depth
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 180) {
          const force = (180 - distance) / 180 * particle.depth;
          particle.vx += (dx / distance) * force * 0.02;
          particle.vy += (dy / distance) * force * 0.02;
        }

        // Update position with depth influence
        particle.x += particle.vx * particle.depth;
        particle.y += particle.vy * particle.depth;

        // Boundary wrap-around for seamless effect
        if (particle.x < -20) particle.x = canvas.width + 20;
        if (particle.x > canvas.width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = canvas.height + 20;
        if (particle.y > canvas.height + 20) particle.y = -20;

        // Apply friction
        particle.vx *= 0.996;
        particle.vy *= 0.996;

        // Enhanced floating animation with depth
        const time = Date.now() * 0.001;
        particle.opacity = particle.baseOpacity + 
          Math.sin(time * 2 + particle.x * 0.008) * 0.2 * particle.depth +
          Math.cos(time * 1.5 + particle.y * 0.006) * 0.15 * particle.depth;
          
        // Dynamic size with breathing effect - ensure positive values
        particle.size = Math.max(0.5, (Math.random() * 2 + 1) * particle.depth + 
          Math.sin(time * 3 + particle.x * 0.01) * 0.8);
      });
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sort particles by depth for proper layering
      const sortedParticles = [...particlesRef.current].sort((a, b) => a.depth - b.depth);
      
      sortedParticles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, particle.opacity));
        
        // Enhanced particle glow with depth - safe size calculation
        const glowSize = Math.max(1, particle.size * (2 + particle.depth * 4));
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, glowSize
        );
        
        const alpha = 0.8 * particle.depth;
        gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 65%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${particle.hue}, 70%, 55%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 45%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Particle core with depth brightness
        const coreAlpha = 0.9 * particle.depth;
        ctx.fillStyle = `hsla(${particle.hue}, 85%, ${55 + particle.depth * 25}%, ${coreAlpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.depth, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Enhanced connection lines with depth and color variation
      ctx.save();
      sortedParticles.forEach((p1, i) => {
        sortedParticles.slice(i + 1, i + 5).forEach(p2 => {
          const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          
          if (distance < 120) {
            const depthFactor = (p1.depth + p2.depth) / 2;
            const lineAlpha = (1 - distance / 120) * 0.2 * depthFactor;
            
            ctx.globalAlpha = lineAlpha;
            ctx.strokeStyle = `hsl(${(p1.hue + p2.hue) / 2}, 70%, 60%)`;
            ctx.lineWidth = depthFactor * 1.8;
            
            // Add gradient to connection lines
            const lineGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            lineGradient.addColorStop(0, `hsla(${p1.hue}, 70%, 60%, ${lineAlpha})`);
            lineGradient.addColorStop(1, `hsla(${p2.hue}, 70%, 60%, ${lineAlpha})`);
            ctx.strokeStyle = lineGradient;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      ctx.restore();
    };

    const animate = () => {
      updateParticles();
      drawParticles();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleResize = () => {
      resizeCanvas();
      particlesRef.current = createParticles();
    };

    // Initialize
    resizeCanvas();
    particlesRef.current = createParticles();
    
    // Event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    // Start animation
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 2,
        mixBlendMode: 'screen'
      }}
    />
  );
}