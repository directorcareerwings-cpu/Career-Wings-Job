import React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackClassName?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function Avatar({ src, name, size = 'md', className, fallbackClassName }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeMap[size],
        className
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary-800 font-semibold',
          fallbackClassName
        )}
      >
        {name ? getInitials(name) : '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

// ─── Company Logo Avatar ────────────────────────────────────────────────────

export function CompanyAvatar({
  logo,
  name,
  size = 'md',
  className,
}: {
  logo?: string
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white',
        sizeMap[size],
        className
      )}
    >
      {logo && (
        <AvatarPrimitive.Image
          src={logo}
          alt={name}
          className="h-full w-full object-contain p-1"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-800 font-bold'
        )}
      >
        {getInitials(name).slice(0, 2)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
