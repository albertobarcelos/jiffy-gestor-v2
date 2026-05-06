'use client'

import { Search } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Busque sua empresa',
  className,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

