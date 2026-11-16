import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { SearchX, AlertTriangle, WifiOff, FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon || <FolderOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-sm text-gray-500 max-w-sm">{message}</p>}
      {action && (
        <Button
          variant="primary"
          size="md"
          className="mt-6"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  type?: 'generic' | 'network' | 'notFound'
}

export function ErrorState({
  title,
  message,
  onRetry,
  type = 'generic',
}: ErrorStateProps) {
  const icons = {
    generic: <AlertTriangle className="h-8 w-8" />,
    network: <WifiOff className="h-8 w-8" />,
    notFound: <SearchX className="h-8 w-8" />,
  }

  const defaults = {
    generic: { title: 'Something went wrong', message: 'An error occurred. Please try again.' },
    network: { title: 'Connection error', message: 'Please check your internet connection.' },
    notFound: { title: 'Not found', message: 'The item you are looking for could not be found.' },
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-400">
        {icons[type]}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title || defaults[type].title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        {message || defaults[type].message}
      </p>
      {onRetry && (
        <Button variant="outline" size="md" className="mt-6" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
