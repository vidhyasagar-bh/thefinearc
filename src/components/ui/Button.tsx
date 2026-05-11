import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/format';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-sans tracking-widest uppercase transition-all duration-400 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-art-charcoal text-art-white hover:bg-art-warm border border-art-charcoal hover:border-art-warm',
    secondary:
      'bg-art-white text-art-charcoal hover:bg-cream-100 border border-art-light hover:border-art-muted',
    ghost:
      'bg-transparent text-art-charcoal hover:text-art-warm border-b border-transparent hover:border-art-warm rounded-none',
    outline:
      'bg-transparent text-art-white border border-art-white hover:bg-art-white hover:text-art-charcoal',
  };

  const sizes = {
    sm: 'text-[10px] px-5 py-2.5 gap-2',
    md: 'text-[11px] px-7 py-3.5 gap-2.5',
    lg: 'text-[11px] px-10 py-4 gap-3',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
