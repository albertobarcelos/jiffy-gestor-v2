'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { CAMPOS_PERMISSAO_PDV, sxCheckboxListaLote } from '../constants'
import type { PermissaoCampoChave } from '../types'

export interface LotePainelPermissoesProps {
  modoPermissao: 'ativar' | 'desativar'
  setModoPermissao: (modo: 'ativar' | 'desativar') => void
  permissoesCamposSelecionados: Set<PermissaoCampoChave>
  isUpdating: boolean
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  produtosSelecionadosCount: number
  todasPermissoesSelecionadas: boolean
  onTogglePermissao: (chave: PermissaoCampoChave) => void
  onToggleSelecionarTodas: () => void
  onLimparSelecao: () => void
  onAplicar: () => void
}

export function LotePainelPermissoes({
  modoPermissao,
  setModoPermissao,
  permissoesCamposSelecionados,
  isUpdating,
  isSalvandoPermissoes,
  isSalvandoFiscal,
  produtosSelecionadosCount,
  todasPermissoesSelecionadas,
  onTogglePermissao,
  onToggleSelecionarTodas,
  onLimparSelecao,
  onAplicar,
}: LotePainelPermissoesProps) {
  const modoClass = (modo: 'ativar' | 'desativar') =>
    `px-3 py-1 rounded text-xs font-semibold transition-colors ${
      modoPermissao === modo ? 'bg-primary text-info' : 'text-secondary-text hover:bg-primary/10'
    }`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="block text-xs font-semibold text-secondary-text">Modo de operação:</label>
        <div className="flex gap-1 bg-info rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setModoPermissao('ativar')
              onLimparSelecao()
            }}
            className={modoClass('ativar')}
          >
            Ativar
          </button>
          <button
            type="button"
            onClick={() => {
              setModoPermissao('desativar')
              onLimparSelecao()
            }}
            className={modoClass('desativar')}
          >
            Desativar
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-secondary-text">
          {modoPermissao === 'ativar'
            ? 'Selecionar Permissões'
            : 'Selecionar Permissões para Desativar'}{' '}
          ({permissoesCamposSelecionados.size} selecionada
          {permissoesCamposSelecionados.size !== 1 ? 's' : ''})
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleSelecionarTodas}
            className="text-xs text-primary hover:underline"
          >
            {todasPermissoesSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
          <div className="flex justify-end max-w-4xl">
            <Button
              type="button"
              onClick={onAplicar}
              disabled={
                isUpdating ||
                isSalvandoPermissoes ||
                isSalvandoFiscal ||
                produtosSelecionadosCount === 0 ||
                permissoesCamposSelecionados.size === 0
              }
              className="md:min-w-[180px] h-8 hover:bg-primary/90"
              sx={{ color: 'var(--color-info)', backgroundColor: 'var(--color-primary)' }}
            >
              {isSalvandoPermissoes
                ? modoPermissao === 'ativar'
                  ? 'Ativando...'
                  : 'Desativando...'
                : modoPermissao === 'ativar'
                  ? `Ativar em ${produtosSelecionadosCount} produto(s)`
                  : `Desativar em ${produtosSelecionadosCount} produto(s)`}
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {CAMPOS_PERMISSAO_PDV.map(({ chave, label }) => {
              const isSelected = permissoesCamposSelecionados.has(chave)
              return (
                <label
                  key={chave}
                  className={`flex min-h-0 items-center gap-0.5 rounded-lg border px-1 py-1 cursor-pointer transition-colors ${
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
                    onChange={() => onTogglePermissao(chave)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                    sx={sxCheckboxListaLote}
                  />
                  <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                    {label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
