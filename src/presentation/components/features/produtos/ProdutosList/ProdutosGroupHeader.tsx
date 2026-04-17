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
    <div className="flex items-center justify-between gap-5 bg-gray-50 px-1 py-1">
      <div className="flex items-center gap-3">
        {grupoVisual ? (
          <span
            className="w-12 h-12 rounded-[10px] border-2 flex items-center justify-center bg-white text-[var(--grupo-color)] transition-colors hover:bg-[var(--grupo-color)] hover:text-white"
            style={{
              borderColor: grupoVisual.corHex,
              ['--grupo-color' as string]: grupoVisual.corHex,
            }}
          >
            <DinamicIcon iconName={grupoVisual.iconName} color="currentColor" size={22} />
          </span>
        ) : (
          <span className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300" />
        )}

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm md:text-base font-semibold text-primary-text tracking-wide uppercase">
              {grupo}
            </p>
            <button
              type="button"
              title="Editar grupo"
              onClick={() => onEditGrupo(grupoId)}
              disabled={!grupoId}
              className={`w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors ${
                !grupoId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <MdModeEdit size={14} />
            </button>
            <div
              className="tooltip-hover-below flex items-center justify-center"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              data-tooltip={
                grupoAtivo ? 'Grupo ativo — clique para desativar' : 'Grupo desativado — clique para ativar'
              }
            >
              <JiffyIconSwitch
                checked={grupoAtivo}
                onChange={(e) => {
                  e.stopPropagation()
                  if (grupoId) onToggleGrupoStatus(grupoId)
                }}
                disabled={!grupoId}
                bordered={false}
                size="sm"
                className="shrink-0 px-0 py-0"
                inputProps={{
                  'aria-label': grupoAtivo ? 'Desativar grupo de produtos' : 'Ativar grupo de produtos',
                  onClick: (e) => e.stopPropagation(),
                }}
              />
            </div>
          </div>
          <p className="text-xs text-secondary-text">{itemCount} produtos</p>
          {grupoVisual && !grupoAtivo && (
            <p className="text-[11px] text-error font-semibold uppercase">Grupo inativo</p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row items-center justify-end flex-1 md:gap-4 gap-2">
        <button
          type="button"
          onClick={() => onAddProduto(grupo, grupoId)}
          className="h-8 md:px-[20px] px-2 bg-info border border-primary/50 text-primary rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center md:gap-2 hover:bg-primary/10 transition-colors"
        >
          Adicionar produto
          <span className="text-sm">+</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleExpand(groupKey)}
          className="flex items-center gap-1 text-primary md:text-sm text-xs font-semibold hover:text-primary/80 transition-colors"
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
