import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  once?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.8,
  direction = 'up',
  className = '',
  once = true,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const offsets = {
    up:    { x: 0,   y: 24 },
    down:  { x: 0,   y: -24 },
    left:  { x: 24,  y: 0 },
    right: { x: -24, y: 0 },
    none:  { x: 0,   y: 0 },
  };
  const { x, y } = offsets[direction];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x, y }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
