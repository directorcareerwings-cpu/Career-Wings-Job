import React from 'react'
import { cn } from '@/lib/utils'

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        hover && 'hover:shadow-md hover:border-gray-200 transition-shadow duration-200',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-gray-100', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-gray-100', className)}
      {...props}
    />
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconBg?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  iconBg = 'bg-primary-100',
  change,
  changeType = 'neutral',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p
              className={cn('text-xs mt-1', {
                'text-green-600': changeType === 'up',
                'text-red-500': changeType === 'down',
                'text-gray-500': changeType === 'neutral',
              })}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
