import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition duration-150 ease-in-out",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
