'use client'

import { memo } from 'react'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdKeyboardArrowDown, MdModeEdit } from 'react-icons/md'
import type { CatalogGrupoVisual } from './types'

export interface CatalogGroupHeaderProps {
  grupo: string
  grupoId?: string
  groupKey: string
  grupoVisual?: CatalogGrupoVisual
  grupoAtivo: boolean
  itemCount: number
  isExpanded: boolean
  showGrupoStatusSwitch?: boolean
  addProdutoLabel?: string
  onToggleExpand: (groupKey: string) => void
  onEditGrupo: (grupoId: string | undefined) => void
  onToggleGrupoStatus?: (grupoId: string) => void
  onAddProduto: (grupoNome: string, grupoId: string | undefined) => void
}

function CatalogGroupHeaderInner({
  grupo,
  grupoId,
  groupKey,
  grupoVisual,
  grupoAtivo,
  itemCount,
  isExpanded,
  showGrupoStatusSwitch = true,
  addProdutoLabel = 'Adicionar produto',
  onToggleExpand,
  onEditGrupo,
  onToggleGrupoStatus,
  onAddProduto,
}: CatalogGroupHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-5 bg-gray-50 px-1 py-1">
      <div className="flex items-center gap-3">
        {grupoVisual ? (
          <span
            className="flex h-12 w-12 items-center justify-center rounded-[10px] border-2 bg-white text-[var(--grupo-color)] transition-colors hover:bg-[var(--grupo-color)] hover:text-white"
            style={{
              borderColor: grupoVisual.corHex,
              ['--grupo-color' as string]: grupoVisual.corHex,
            }}
          >
            <DinamicIcon iconName={grupoVisual.iconName} color="currentColor" size={22} />
          </span>
        ) : (
          <span className="h-9 w-9 rounded-full border border-gray-300 bg-gray-200" />
        )}

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-wide text-primary-text md:text-base">
              {grupo}
            </p>
            <button
              type="button"
              title="Editar grupo"
              onClick={() => onEditGrupo(grupoId)}
              disabled={!grupoId}
              className={`flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10 ${
                !grupoId ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <MdModeEdit size={14} />
            </button>
            {showGrupoStatusSwitch ? (
              <div
                className="tooltip-hover-below flex items-center justify-center"
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
                    if (grupoId) onToggleGrupoStatus?.(grupoId)
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
            ) : null}
          </div>
          <p className="text-xs text-secondary-text">{itemCount} produtos</p>
          {grupoVisual && showGrupoStatusSwitch && !grupoAtivo ? (
            <p className="text-[11px] font-semibold uppercase text-error">Grupo inativo</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col-reverse items-center justify-end gap-2 md:flex-row md:gap-4">
        <button
          type="button"
          onClick={() => onAddProduto(grupo, grupoId)}
          className="flex h-8 items-center px-2 text-xs font-semibold text-primary transition-colors rounded-lg border border-primary/50 bg-info hover:bg-primary/10 md:gap-2 md:px-[20px] md:text-sm"
        >
          {addProdutoLabel}
          <span className="text-sm">+</span>
        </button>
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
    </div>
  )
}

export const CatalogGroupHeader = memo(CatalogGroupHeaderInner)
