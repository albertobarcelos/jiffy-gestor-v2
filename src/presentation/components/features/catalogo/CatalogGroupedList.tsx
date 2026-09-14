'use client'

import { useMemo, useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { CatalogGroupHeader } from './CatalogGroupHeader'
import type { CatalogGroup } from './types'
import { cn } from '@/src/shared/utils/cn'

export interface CatalogGroupedListProps<T> {
  groups: CatalogGroup<T>[]
  getItemKey: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  expandedGroups: Record<string, boolean>
  isLoading?: boolean
  emptyLabel?: string
  /** Substitui `emptyLabel` quando a lista está vazia. */
  emptyContent?: ReactNode
  listAriaLabel?: string
  showGrupoStatusSwitch?: boolean
  showHeaderActions?: boolean
  itemCountSuffix?: string
  /** Ex.: "Produtos" ou "Terminais" — usado na mensagem de grupo recolhido. */
  collapsedHintItemLabel?: string
  /** Exibe caixa tracejada quando o grupo está recolhido. Default: true. */
  showCollapsedHint?: boolean
  addProdutoLabel?: string
  renderBeforeGroupItems?: (group: CatalogGroup<T>) => ReactNode
  renderGroupHeaderAddon?: (group: CatalogGroup<T>) => ReactNode
  onToggleExpand: (groupKey: string) => void
  onEditGrupo?: (grupoId: string | undefined) => void
  onToggleGrupoStatus?: (grupoId: string) => void
  onAddProduto?: (grupoNome: string, grupoId: string | undefined) => void
  /**
   * Virtualiza a lista (só linhas visíveis no DOM).
   * Use em listas longas com scroll próprio (ex.: cardápio).
   */
  virtualize?: boolean
  className?: string
}

type FlatRow<T> =
  | { kind: 'header'; group: CatalogGroup<T> }
  | { kind: 'before'; group: CatalogGroup<T> }
  | { kind: 'item'; group: CatalogGroup<T>; item: T; index: number }
  | { kind: 'collapsed'; group: CatalogGroup<T> }

const EST_HEADER = 52
const EST_ITEM = 76
const EST_COLLAPSED = 44
const EST_BEFORE = 40

function flattenGroups<T>(
  groups: CatalogGroup<T>[],
  expandedGroups: Record<string, boolean>,
  showCollapsedHint: boolean,
  hasBefore: boolean
): FlatRow<T>[] {
  const rows: FlatRow<T>[] = []
  for (const group of groups) {
    rows.push({ kind: 'header', group })
    const isExpanded = expandedGroups[group.groupKey] !== false
    if (!isExpanded && showCollapsedHint) {
      rows.push({ kind: 'collapsed', group })
      continue
    }
    if (!isExpanded) continue
    if (hasBefore) rows.push({ kind: 'before', group })
    group.items.forEach((item, index) => {
      rows.push({ kind: 'item', group, item, index })
    })
  }
  return rows
}

function estimateRowSize<T>(row: FlatRow<T>): number {
  switch (row.kind) {
    case 'header':
      return EST_HEADER
    case 'collapsed':
      return EST_COLLAPSED
    case 'before':
      return EST_BEFORE
    case 'item':
      return EST_ITEM
  }
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
  showHeaderActions = true,
  itemCountSuffix = 'produtos',
  collapsedHintItemLabel = 'Produtos',
  showCollapsedHint = true,
  addProdutoLabel,
  renderBeforeGroupItems,
  renderGroupHeaderAddon,
  onToggleExpand,
  onEditGrupo,
  onToggleGrupoStatus,
  onAddProduto,
  virtualize = false,
  className,
}: CatalogGroupedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const flatRows = useMemo(
    () =>
      flattenGroups(
        groups,
        expandedGroups,
        showCollapsedHint,
        Boolean(renderBeforeGroupItems)
      ),
    [expandedGroups, groups, renderBeforeGroupItems, showCollapsedHint]
  )

  const virtualizer = useVirtualizer({
    count: virtualize ? flatRows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: index => estimateRowSize(flatRows[index]!),
    overscan: 8,
    getItemKey: index => {
      const row = flatRows[index]
      if (!row) return index
      if (row.kind === 'item') {
        return `${row.group.groupKey}:item:${getItemKey(row.item)}`
      }
      return `${row.group.groupKey}:${row.kind}`
    },
  })

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

  const renderHeader = (group: CatalogGroup<T>) => (
    <CatalogGroupHeader
      grupo={group.grupoLabel}
      grupoId={group.grupoId}
      groupKey={group.groupKey}
      grupoVisual={group.grupoVisual}
      grupoAtivo={group.grupoAtivo}
      itemCount={group.items.length}
      isExpanded={expandedGroups[group.groupKey] !== false}
      showGrupoStatusSwitch={showGrupoStatusSwitch}
      showHeaderActions={showHeaderActions}
      itemCountSuffix={itemCountSuffix}
      addProdutoLabel={addProdutoLabel}
      headerAddon={renderGroupHeaderAddon?.(group)}
      onToggleExpand={onToggleExpand}
      onEditGrupo={onEditGrupo}
      onToggleGrupoStatus={onToggleGrupoStatus}
      onAddProduto={onAddProduto}
    />
  )

  const renderCollapsed = (group: CatalogGroup<T>) => (
    <div className="mx-1 rounded-xl border border-dashed border-secondary/40 px-4 py-1 text-sm text-secondary-text">
      {collapsedHintItemLabel} ocultos. Clique{' '}
      <button
        type="button"
        onClick={() => onToggleExpand(group.groupKey)}
        className="rounded-sm font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        aqui!
      </button>{' '}
      para visualizar.
    </div>
  )

  if (virtualize) {
    const items = virtualizer.getVirtualItems()
    return (
      <div
        ref={parentRef}
        role="list"
        aria-label={listAriaLabel}
        className={cn('h-full overflow-y-auto pb-4', className)}
      >
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {items.map(virtualRow => {
            const row = flatRows[virtualRow.index]
            if (!row) return null
            return (
              <div
                key={virtualRow.key}
                role="listitem"
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.kind === 'header' ? (
                  <div className="bg-gray-50">{renderHeader(row.group)}</div>
                ) : null}
                {row.kind === 'collapsed' ? renderCollapsed(row.group) : null}
                {row.kind === 'before' ? renderBeforeGroupItems?.(row.group) : null}
                {row.kind === 'item' ? (
                  <div className="relative z-0 overflow-visible rounded-lg bg-white has-[.tooltip-hover-above:hover]:z-[200] has-[.tooltip-hover-below:hover]:z-[200]">
                    {renderItem(row.item, row.index)}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      role="list"
      aria-label={listAriaLabel}
      className={cn('space-y-4 pb-4', className)}
    >
      {groups.map(group => {
        const isExpanded = expandedGroups[group.groupKey] !== false
        return (
          <div key={group.groupKey} role="listitem" className="space-y-1">
            <div className="sticky top-0 z-20 -mx-1 bg-gray-50">
              {renderHeader(group)}
            </div>

            {!isExpanded && showCollapsedHint ? (
              renderCollapsed(group)
            ) : isExpanded ? (
              <div className="overflow-visible rounded-lg bg-white">
                {renderBeforeGroupItems?.(group)}
                {group.items.map((item, index) => (
                  <div
                    key={getItemKey(item)}
                    className="relative z-0 overflow-visible has-[.tooltip-hover-above:hover]:z-[200] has-[.tooltip-hover-below:hover]:z-[200]"
                  >
                    {renderItem(item, index)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
