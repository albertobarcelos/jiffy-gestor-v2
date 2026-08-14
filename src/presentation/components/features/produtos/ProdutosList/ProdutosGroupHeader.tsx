'use client'

import { memo } from 'react'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdKeyboardArrowDown, MdModeEdit } from 'react-icons/md'

interface GrupoVisual {
  corHex: string
  iconName: string
}

/**
 * Handlers recebem os IDs como argumento para que o componente possa ser
 * memoizado sem que callbacks inline invalidem o memo em cada render do pai.
 */
export interface ProdutosGroupHeaderProps {
  grupo: string
  grupoId?: string
  groupKey: string
  grupoVisual?: GrupoVisual
  grupoAtivo: boolean
  itemCount: number
  isExpanded: boolean
  onToggleExpand: (groupKey: string) => void
  onEditGrupo: (grupoId: string | undefined) => void
  onToggleGrupoStatus: (grupoId: string) => void
  onAddProduto: (grupoNome: string, grupoId: string | undefined) => void
}

function ProdutosGroupHeaderInner({
  grupo,
  grupoId,
  groupKey,
  grupoVisual,
  grupoAtivo,
  itemCount,
  isExpanded,
  onToggleExpand,
  onEditGrupo,
  onToggleGrupoStatus,
  onAddProduto,
}: ProdutosGroupHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 bg-gray-50 px-2 py-2 md:flex-row md:items-center md:justify-between md:gap-5 md:px-1 md:py-1">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {grupoVisual ? (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-2 bg-white text-[var(--grupo-color)] transition-colors hover:bg-[var(--grupo-color)] hover:text-white md:h-12 md:w-12"
            style={{
              borderColor: grupoVisual.corHex,
              ['--grupo-color' as string]: grupoVisual.corHex,
            }}
          >
            <DinamicIcon iconName={grupoVisual.iconName} color="currentColor" size={22} />
          </span>
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-gray-200" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate text-sm font-semibold tracking-wide text-primary-text md:text-base">
              {grupo}
            </p>
            <button
              type="button"
              title="Editar grupo"
              onClick={() => onEditGrupo(grupoId)}
              disabled={!grupoId}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10 md:h-5 md:w-5 ${
                !grupoId ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <MdModeEdit size={14} />
            </button>
            <div
              className="tooltip-hover-below hidden shrink-0 items-center justify-center md:flex"
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              data-tooltip={
                grupoAtivo
                  ? 'Grupo ativo — clique para desativar'
                  : 'Grupo desativado — clique para ativar'
              }
            >
              <JiffyIconSwitch
                checked={grupoAtivo}
                onChange={e => {
                  e.stopPropagation()
                  if (grupoId) onToggleGrupoStatus(grupoId)
                }}
                disabled={!grupoId}
                bordered={false}
                size="sm"
                className="shrink-0 px-0 py-0"
                inputProps={{
                  'aria-label': grupoAtivo
                    ? 'Desativar grupo de produtos'
                    : 'Ativar grupo de produtos',
                  onClick: e => e.stopPropagation(),
                }}
              />
            </div>
          </div>
          <p className="text-xs text-secondary-text">{itemCount} produtos</p>
          {grupoVisual && !grupoAtivo && (
            <p className="text-[11px] font-semibold uppercase text-error">Grupo inativo</p>
          )}
        </div>

        <div
          className="flex shrink-0 items-center gap-1 md:hidden"
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <JiffyIconSwitch
            checked={grupoAtivo}
            onChange={e => {
              e.stopPropagation()
              if (grupoId) onToggleGrupoStatus(grupoId)
            }}
            disabled={!grupoId}
            bordered={false}
            size="sm"
            className="shrink-0 px-0 py-0"
            inputProps={{
              'aria-label': grupoAtivo
                ? 'Desativar grupo de produtos'
                : 'Ativar grupo de produtos',
              onClick: e => e.stopPropagation(),
            }}
          />
          <button
            type="button"
            onClick={() => onToggleExpand(groupKey)}
            className="flex h-8 items-center gap-0.5 pl-1 text-xs font-semibold text-primary"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Ocultar' : 'Exibir'}</span>
            <MdKeyboardArrowDown
              className={`text-lg transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:justify-end md:gap-4">
        <button
          type="button"
          onClick={() => onAddProduto(grupo, grupoId)}
          className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-primary/50 bg-info px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 md:w-auto md:flex-none md:gap-2 md:px-[20px] md:text-sm"
        >
          Adicionar produto
          <span className="text-sm">+</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleExpand(groupKey)}
          className="hidden h-8 shrink-0 items-center gap-1 px-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 md:flex md:text-sm"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Ocultar' : 'Exibir'}</span>
          <MdKeyboardArrowDown
            className={`text-lg transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>
      </div>
    </div>
  )
}

export const ProdutosGroupHeader = memo(ProdutosGroupHeaderInner)
