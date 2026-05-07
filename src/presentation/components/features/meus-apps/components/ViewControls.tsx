'use client'

import { Building2, Layers, LayoutGrid, List, Mail, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'

export type MeusAppsViewMode = 'grid' | 'list'

/** O que entra no feed: ambos, só convites ou só empresas vinculadas. */
export type MeusAppsFeedFiltro = 'tudo' | 'convites' | 'empresas'

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
  feedFiltro,
  onFeedFiltroChange,
  onOpenFilters,
}: {
  mode: MeusAppsViewMode
  onModeChange: (m: MeusAppsViewMode) => void
  feedFiltro: MeusAppsFeedFiltro
  onFeedFiltroChange: (f: MeusAppsFeedFiltro) => void
  onOpenFilters?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <IconButton label="Visualização em lista" active={mode === 'list'} onClick={() => onModeChange('list')}>
        <List className="h-4 w-4" aria-hidden />
      </IconButton>
      <IconButton label="Visualização em grade" active={mode === 'grid'} onClick={() => onModeChange('grid')}>
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </IconButton>
      <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:inline-block" aria-hidden />
      <IconButton
        label="Exibir convites e empresas"
        active={feedFiltro === 'tudo'}
        onClick={() => onFeedFiltroChange('tudo')}
      >
        <Layers className="h-4 w-4" aria-hidden />
      </IconButton>
      <IconButton
        label="Exibir somente convites pendentes"
        active={feedFiltro === 'convites'}
        onClick={() => onFeedFiltroChange('convites')}
      >
        <Mail className="h-4 w-4" aria-hidden />
      </IconButton>
      <IconButton
        label="Exibir somente empresas vinculadas"
        active={feedFiltro === 'empresas'}
        onClick={() => onFeedFiltroChange('empresas')}
      >
        <Building2 className="h-4 w-4" aria-hidden />
      </IconButton>
      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
      <IconButton label="Filtros" onClick={() => onOpenFilters?.()}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </IconButton>
    </div>
  )
}

