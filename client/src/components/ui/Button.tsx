import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500 shadow-sm',
        secondary:
          'bg-primary-900 text-white hover:bg-primary-800 focus-visible:ring-primary-900 shadow-sm',
        outline:
          'border-2 border-primary-900 text-primary-900 hover:bg-primary-900 hover:text-white focus-visible:ring-primary-900',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
        danger:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        'outline-accent':
          'border-2 border-accent-500 text-accent-600 hover:bg-accent-500 hover:text-white focus-visible:ring-accent-500',
        white:
          'bg-white text-primary-900 hover:bg-gray-50 shadow-sm focus-visible:ring-white',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 h-8',
        md: 'text-sm px-4 py-2.5 h-10',
        lg: 'text-base px-6 py-3 h-12',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { buttonVariants }
