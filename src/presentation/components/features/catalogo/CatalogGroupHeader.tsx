'use client'

import { memo, type ReactNode } from 'react'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdKeyboardArrowDown, MdModeEdit } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import type { CatalogGrupoVisual } from './types'

export interface CatalogGroupHeaderProps {
  grupo: string
  grupoId?: string
  groupKey: string
  grupoVisual?: CatalogGrupoVisual
  grupoAtivo: boolean
  itemCount: number
  /** Substitui o texto padrão "{n} {itemCountSuffix}". */
  itemCountSubtitle?: string
  isExpanded: boolean
  showGrupoStatusSwitch?: boolean
  /** Exibe editar categoria, switch de status e botão de adicionar. Default: true. */
  showHeaderActions?: boolean
  itemCountSuffix?: string
  addProdutoLabel?: string
  /** Conteúdo extra ao lado do título (ex.: seletor de menu em lote). */
  headerAddon?: ReactNode
  /** Ações extras ao lado do lápis de edição (ex.: reordenar categoria). */
  extraActions?: ReactNode
  /**
   * Coluna de ações alinhada às linhas de produto/sabor
   * (`catalog-row-area-acoes`), ex.: permitir acréscimo/desconto.
   */
  actionsSlot?: ReactNode
  /** Cabeçalho mais baixo, alinhado a `CatalogProductRow` compact. */
  compact?: boolean
  onToggleExpand: (groupKey: string) => void
  onEditGrupo?: (grupoId: string | undefined) => void
  onToggleGrupoStatus?: (grupoId: string) => void
  onAddProduto?: (grupoNome: string, grupoId: string | undefined) => void
}

function CatalogGroupHeaderInner({
  grupo,
  grupoId,
  groupKey,
  grupoVisual,
  grupoAtivo,
  itemCount,
  itemCountSubtitle,
  isExpanded,
  showGrupoStatusSwitch = true,
  showHeaderActions = true,
  itemCountSuffix = 'produtos',
  addProdutoLabel = 'Adicionar produto',
  headerAddon,
  extraActions,
  actionsSlot,
  compact = false,
  onToggleExpand,
  onEditGrupo,
  onToggleGrupoStatus,
  onAddProduto,
}: CatalogGroupHeaderProps) {
  const visual = grupoVisual ? (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[10px] border-2 bg-white text-[var(--grupo-color)] transition-colors hover:bg-[var(--grupo-color)] hover:text-white',
        compact ? 'h-8 w-8 md:h-9 md:w-9' : 'h-10 w-10 md:h-12 md:w-12'
      )}
      style={{
        borderColor: grupoVisual.corHex,
        ['--grupo-color' as string]: grupoVisual.corHex,
      }}
    >
      <DinamicIcon
        iconName={grupoVisual.iconName}
        color="currentColor"
        size={compact ? 18 : 22}
      />
    </span>
  ) : showHeaderActions ? (
    <span
      className={cn(
        'rounded-full border border-gray-300 bg-gray-200',
        compact ? 'h-8 w-8' : 'h-9 w-9'
      )}
    />
  ) : null

  const tituloEControles = (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-semibold tracking-wide text-primary-text md:text-base">
          {grupo}
        </p>
        {headerAddon}
        {showHeaderActions ? (
          <button
            type="button"
            title="Editar categoria"
            onClick={() => onEditGrupo?.(grupoId)}
            disabled={!grupoId}
            className={`flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10 ${
              !grupoId ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <MdModeEdit size={14} />
          </button>
        ) : null}
        {extraActions}
        {showHeaderActions && showGrupoStatusSwitch ? (
          <div
            className="tooltip-hover-below flex items-center justify-center"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            data-tooltip={
              grupoAtivo
                ? 'Categoria ativa — clique para desativar'
                : 'Categoria desativada — clique para ativar'
            }
          >
            <JiffyIconSwitch
              checked={grupoAtivo}
              onChange={e => {
                e.stopPropagation()
                if (grupoId) onToggleGrupoStatus?.(grupoId)
              }}
              disabled={!grupoId}
              bordered={false}
              size="sm"
              className="shrink-0 px-0 py-0"
              inputProps={{
                'aria-label': grupoAtivo ? 'Desativar categoria' : 'Ativar categoria',
                onClick: e => e.stopPropagation(),
              }}
            />
          </div>
        ) : null}
      </div>
      <p className="text-xs text-secondary-text">
        {itemCountSubtitle ?? `${itemCount} ${itemCountSuffix}`}
      </p>
      {grupoVisual && showGrupoStatusSwitch && !grupoAtivo ? (
        <p className="text-[11px] font-semibold uppercase text-error">Categoria inativa</p>
      ) : null}
    </div>
  )

  const botoesDireita = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:gap-4">
      {showHeaderActions ? (
        <button
          type="button"
          onClick={() => onAddProduto?.(grupo, grupoId)}
          className="flex h-8 items-center px-2 text-xs font-semibold text-primary transition-colors rounded-lg border border-primary/50 bg-info hover:bg-primary/10 md:gap-2 md:px-[20px] md:text-sm"
        >
          <span className="md:hidden">Adicionar</span>
          <span className="hidden md:inline">{addProdutoLabel}</span>
          <span className="text-sm">+</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onToggleExpand(groupKey)}
        className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 md:text-sm"
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? 'Ocultar' : 'Exibir'}</span>
        <MdKeyboardArrowDown
          className={`text-lg transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
    </div>
  )

  if (actionsSlot) {
    return (
      <div
        className={cn(
          /* Mesmo padding/borda das linhas CatalogProductRow (menu) */
          'catalog-row-menu-hidecodigo-actions-centered grid items-start gap-x-2 gap-y-1.5 border border-transparent bg-gray-50 px-2 py-2 md:items-center md:gap-x-2 md:gap-y-2 md:px-4',
          compact && 'py-1 md:gap-y-1'
        )}
      >
        {/* Mesma caixa da foto das linhas (h-14/16) para a coluna auto coincidir */}
        <div
          className={cn(
            'catalog-row-area-foto flex shrink-0 items-center justify-center',
            compact ? 'h-10 w-10 md:h-11 md:w-11' : 'h-14 w-14 md:h-16 md:w-16'
          )}
        >
          {visual}
        </div>
        <div className="catalog-row-area-nome min-w-0 max-w-[34ch] justify-self-start">
          {tituloEControles}
        </div>
        <div className="catalog-row-area-acoes flex min-w-0 flex-nowrap items-center justify-start">
          {actionsSlot}
        </div>
        <div className="catalog-row-area-meta catalog-row-area-side justify-self-stretch">
          {botoesDireita}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2 bg-gray-50 px-1 py-1 md:items-center md:gap-5">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {visual}
        {tituloEControles}
      </div>
      {botoesDireita}
    </div>
  )
}

export const CatalogGroupHeader = memo(CatalogGroupHeaderInner)
