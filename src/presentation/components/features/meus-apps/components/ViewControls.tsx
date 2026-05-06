'use client'

import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'

export type MeusAppsViewMode = 'grid' | 'list'

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border text-gray-700 shadow-sm transition',
        active ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent hover:bg-gray-100'
      )}
      aria-pressed={active ? 'true' : 'false'}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

export function ViewControls({
  mode,
  onModeChange,
  onOpenFilters,
}: {
  mode: MeusAppsViewMode
  onModeChange: (m: MeusAppsViewMode) => void
  onOpenFilters?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Visualização em lista" active={mode === 'list'} onClick={() => onModeChange('list')}>
        <List className="h-4 w-4" aria-hidden />
      </IconButton>
      <IconButton label="Visualização em grade" active={mode === 'grid'} onClick={() => onModeChange('grid')}>
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </IconButton>
      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
      <IconButton label="Filtros" onClick={() => onOpenFilters?.()}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </IconButton>
    </div>
  )
}

