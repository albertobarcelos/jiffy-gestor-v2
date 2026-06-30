'use client'

import type { Impressora } from '@/src/domain/entities/Impressora'
import { Button } from '@/src/presentation/components/ui/button'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { sxCheckboxListaLote } from '../constants'

export interface LotePainelImpressorasProps {
  modoImpressora: 'adicionar' | 'remover'
  setModoImpressora: (modo: 'adicionar' | 'remover') => void
  impressorasSelecionadas: Set<string>
  impressorasDisponiveis: Impressora[]
  isLoadingImpressoras: boolean
  isUpdating: boolean
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  produtosSelecionadosCount: number
  todasImpressorasSelecionadas: boolean
  onToggleImpressora: (id: string) => void
  onToggleSelecionarTodas: () => void
  onLimparSelecao: () => void
  onAplicar: () => void
}

export function LotePainelImpressoras({
  modoImpressora,
  setModoImpressora,
  impressorasSelecionadas,
  impressorasDisponiveis,
  isLoadingImpressoras,
  isUpdating,
  isSalvandoPermissoes,
  isSalvandoFiscal,
  produtosSelecionadosCount,
  todasImpressorasSelecionadas,
  onToggleImpressora,
  onToggleSelecionarTodas,
  onLimparSelecao,
  onAplicar,
}: LotePainelImpressorasProps) {
  const modoClass = (modo: 'adicionar' | 'remover') =>
    `px-3 py-1 rounded text-xs font-semibold transition-colors ${
      modoImpressora === modo ? 'bg-primary text-info' : 'text-secondary-text hover:bg-primary/10'
    }`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="block text-xs font-semibold text-secondary-text">Modo de operação:</label>
        <div className="flex gap-1 bg-info rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setModoImpressora('adicionar')
              onLimparSelecao()
            }}
            className={modoClass('adicionar')}
          >
            Vincular
          </button>
          <button
            type="button"
            onClick={() => {
              setModoImpressora('remover')
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
          {modoImpressora === 'adicionar'
            ? 'Selecionar Impressoras'
            : 'Selecionar Impressoras para Remover'}{' '}
          ({impressorasSelecionadas.size} selecionada
          {impressorasSelecionadas.size !== 1 ? 's' : ''})
        </label>
        <div className="flex items-center gap-4">
          {impressorasDisponiveis.length > 0 && (
            <button
              type="button"
              onClick={onToggleSelecionarTodas}
              className="text-xs text-primary hover:underline"
            >
              {todasImpressorasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
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
                impressorasSelecionadas.size === 0
              }
              className="md:min-w-[180px] h-8 hover:bg-primary/90"
              sx={{ color: 'var(--color-info)', backgroundColor: 'var(--color-primary)' }}
            >
              {isUpdating
                ? modoImpressora === 'adicionar'
                  ? 'Adicionando...'
                  : 'Removendo...'
                : modoImpressora === 'adicionar'
                  ? `Vincular a ${produtosSelecionadosCount} produto(s)`
                  : `Desvincular de ${produtosSelecionadosCount} produto(s)`}
            </Button>
          </div>
        </div>
      </div>
      {isLoadingImpressoras ? (
        <div className="flex items-center justify-start py-4">
          <span className="text-sm text-secondary-text">Carregando impressoras...</span>
        </div>
      ) : impressorasDisponiveis.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-sm text-secondary-text">Nenhuma impressora disponível</span>
        </div>
      ) : (
        <div className="w-full">
          <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {impressorasDisponiveis.map((impressora) => {
                const isSelected = impressorasSelecionadas.has(impressora.getId())
                return (
                  <label
                    key={impressora.getId()}
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
                      onChange={() => onToggleImpressora(impressora.getId())}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                      sx={sxCheckboxListaLote}
                    />
                    <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                      {impressora.getNome()}
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
