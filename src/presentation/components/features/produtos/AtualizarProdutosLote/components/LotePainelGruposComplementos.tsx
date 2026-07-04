'use client'

import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Button } from '@/src/presentation/components/ui/button'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { sxCheckboxListaLote } from '../constants'

export interface LotePainelGruposComplementosProps {
  modoGrupoComplemento: 'adicionar' | 'remover'
  setModoGrupoComplemento: (modo: 'adicionar' | 'remover') => void
  gruposComplementosSelecionados: Set<string>
  gruposComplementos: GrupoComplemento[]
  isLoadingGruposComplementos: boolean
  isUpdating: boolean
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  produtosSelecionadosCount: number
  todosGruposComplementosSelecionados: boolean
  onToggleGrupo: (id: string) => void
  onToggleSelecionarTodos: () => void
  onLimparSelecao: () => void
  onAplicar: () => void
}

export function LotePainelGruposComplementos({
  modoGrupoComplemento,
  setModoGrupoComplemento,
  gruposComplementosSelecionados,
  gruposComplementos,
  isLoadingGruposComplementos,
  isUpdating,
  isSalvandoPermissoes,
  isSalvandoFiscal,
  produtosSelecionadosCount,
  todosGruposComplementosSelecionados,
  onToggleGrupo,
  onToggleSelecionarTodos,
  onLimparSelecao,
  onAplicar,
}: LotePainelGruposComplementosProps) {
  const modoClass = (modo: 'adicionar' | 'remover') =>
    `px-3 py-1 rounded text-xs font-semibold transition-colors ${
      modoGrupoComplemento === modo
        ? 'bg-primary text-info'
        : 'text-secondary-text hover:bg-primary/10'
    }`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="block text-xs font-semibold text-secondary-text">Modo de operação:</label>
        <div className="flex gap-1 bg-info rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setModoGrupoComplemento('adicionar')
              onLimparSelecao()
            }}
            className={modoClass('adicionar')}
          >
            Vincular
          </button>
          <button
            type="button"
            onClick={() => {
              setModoGrupoComplemento('remover')
              onLimparSelecao()
            }}
            className={modoClass('remover')}
          >
            Desvincular
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-secondary-text">
          {modoGrupoComplemento === 'adicionar'
            ? 'Selecionar Grupos de Complementos'
            : 'Selecionar Grupos de Complementos para Remover'}{' '}
          ({gruposComplementosSelecionados.size} selecionado
          {gruposComplementosSelecionados.size !== 1 ? 's' : ''})
        </label>
        <div className="flex items-center gap-4">
          {gruposComplementos.length > 0 && (
            <button
              type="button"
              onClick={onToggleSelecionarTodos}
              className="text-xs text-primary hover:underline"
            >
              {todosGruposComplementosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
          <div className="flex justify-end max-w-4xl">
            <Button
              onClick={onAplicar}
              disabled={
                isUpdating ||
                isSalvandoPermissoes ||
                isSalvandoFiscal ||
                produtosSelecionadosCount === 0 ||
                gruposComplementosSelecionados.size === 0
              }
              className="md:min-w-[180px] h-8 hover:bg-primary/90"
              sx={{ color: 'var(--color-info)', backgroundColor: 'var(--color-primary)' }}
            >
              {isUpdating
                ? modoGrupoComplemento === 'adicionar'
                  ? 'Vinculando...'
                  : 'Desvinculando...'
                : modoGrupoComplemento === 'adicionar'
                  ? `Vincular a ${produtosSelecionadosCount} produto(s)`
                  : `Desvincular de ${produtosSelecionadosCount} produto(s)`}
            </Button>
          </div>
        </div>
      </div>
      {isLoadingGruposComplementos ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-sm text-secondary-text">Carregando grupos de complementos...</span>
        </div>
      ) : gruposComplementos.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-sm text-secondary-text">Nenhum grupo de complementos disponível</span>
        </div>
      ) : (
        <div className="w-full">
          <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {gruposComplementos.map((grupo) => {
                const isSelected = gruposComplementosSelecionados.has(grupo.getId())
                return (
                  <label
                    key={grupo.getId()}
                    className={`flex min-h-0 items-center gap-0.5 rounded-lg border p-1 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      size="small"
                      disableRipple
                      disableFocusRipple
                      checked={isSelected}
                      onChange={() => onToggleGrupo(grupo.getId())}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                      sx={sxCheckboxListaLote}
                    />
                    <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                      {grupo.getNome()}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
