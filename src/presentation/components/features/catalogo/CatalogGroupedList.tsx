'use client'

import type { ReactNode } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { CatalogGroupHeader } from './CatalogGroupHeader'
import type { CatalogGroup } from './types'

export interface CatalogGroupedListProps<T> {
  groups: CatalogGroup<T>[]
  getItemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  expandedGroups: Record<string, boolean>
  isLoading?: boolean
  emptyLabel?: string
  /** Substitui `emptyLabel` quando a lista está vazia. */
  emptyContent?: ReactNode
  listAriaLabel?: string
  showGrupoStatusSwitch?: boolean
  addProdutoLabel?: string
  onToggleExpand: (groupKey: string) => void
  onEditGrupo: (grupoId: string | undefined) => void
  onToggleGrupoStatus?: (grupoId: string) => void
  onAddProduto: (grupoNome: string, grupoId: string | undefined) => void
}

export function CatalogGroupedList<T>({
  groups,
  getItemKey,
  renderItem,
  expandedGroups,
  isLoading = false,
  emptyLabel = 'Nenhum produto encontrado.',
  emptyContent,
  listAriaLabel = 'Lista de produtos',
  showGrupoStatusSwitch = true,
  addProdutoLabel,
  onToggleExpand,
  onEditGrupo,
  onToggleGrupoStatus,
  onAddProduto,
}: CatalogGroupedListProps<T>) {
  if (isLoading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <JiffyLoading />
      </div>
    )
  }

  if (!isLoading && groups.length === 0) {
    if (emptyContent) return emptyContent
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-secondary-text">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div role="list" aria-label={listAriaLabel} className="space-y-4 pb-4">
      {groups.map(group => {
        const isExpanded = expandedGroups[group.groupKey] !== false
        return (
          <div key={group.groupKey} role="listitem" className="space-y-1">
            <div className="sticky top-0 z-20 -mx-1 bg-gray-50">
              <CatalogGroupHeader
                grupo={group.grupoLabel}
                grupoId={group.grupoId}
                groupKey={group.groupKey}
                grupoVisual={group.grupoVisual}
                grupoAtivo={group.grupoAtivo}
                itemCount={group.items.length}
                isExpanded={isExpanded}
                showGrupoStatusSwitch={showGrupoStatusSwitch}
                addProdutoLabel={addProdutoLabel}
                onToggleExpand={onToggleExpand}
                onEditGrupo={onEditGrupo}
                onToggleGrupoStatus={onToggleGrupoStatus}
                onAddProduto={onAddProduto}
              />
            </div>

            {!isExpanded ? (
              <div className="mx-1 rounded-xl border border-dashed border-secondary/40 px-4 py-1 text-sm text-secondary-text">
                Produtos ocultos. Clique{' '}
                <button
                  type="button"
                  onClick={() => onToggleExpand(group.groupKey)}
                  className="rounded-sm font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  aqui!
                </button>{' '}
                para visualizar.
              </div>
            ) : (
              <div className="overflow-visible rounded-lg bg-white">
                {group.items.map(item => (
                  <div
                    key={getItemKey(item)}
                    className="relative z-0 overflow-visible has-[.tooltip-hover-above:hover]:z-[200] has-[.tooltip-hover-below:hover]:z-[200]"
                  >
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
