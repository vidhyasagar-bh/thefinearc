import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const baseInput =
  'w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm placeholder:text-art-muted focus:outline-none focus:border-art-charcoal transition-colors duration-300 py-3';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-[10px] tracking-widest uppercase text-art-muted font-sans">
          {label}
        </label>
      )}
      <input ref={ref} className={cn(baseInput, className)} {...props} />
      {error && <p className="text-xs text-red-500 font-sans">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-[10px] tracking-widest uppercase text-art-muted font-sans">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={4}
        className={cn(baseInput, 'resize-none', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-sans">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
