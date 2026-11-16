import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  className?: string
  itemLabel?: string
}

export function Pagination({ page, pages, total, limit, onPageChange, className, itemLabel = 'results' }: PaginationProps) {
  if (pages <= 1) return null

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const getPageNumbers = (): (number | '...')[] => {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1)
    }
    const items: (number | '...')[] = [1]
    if (page > 3) items.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) {
      items.push(i)
    }
    if (page < pages - 2) items.push('...')
    items.push(pages)
    return items
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100', className)}>
      {/* Info text */}
      <p className="text-xs text-gray-500 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{start}–{end}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span> {itemLabel}
      </p>

      {/* Page number buttons */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                page === p
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
