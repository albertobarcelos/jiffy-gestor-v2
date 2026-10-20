'use client'

import { useState } from 'react'
import { MdRefresh } from 'react-icons/md'
import { TbCashRegister } from 'react-icons/tb'
import { KanbanModoVendasToggle, type ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ModoVisualizacaoKanban } from '../utils/kanbanModoVisualizacao'
import { CompartilharCardapioPublicoButton } from './CompartilharCardapioPublicoButton'
import { KanbanModoVisualizacaoSelect } from './KanbanModoVisualizacaoSelect'

export function KanbanToolbarAcoesOperacao({
  noFredy,
  onRefresh,
  onAbrirCaixaEstacao,
  caixaAberta,
  modoKanbanVendas,
  onModoKanbanVendasChange,
  modoVisualizacao,
  onModoVisualizacaoChange,
}: {
  noFredy: boolean
  onRefresh: () => void | Promise<void>
  onAbrirCaixaEstacao: () => void
  caixaAberta?: boolean | null
  modoKanbanVendas: ModoKanbanVendas
  onModoKanbanVendasChange: (value: ModoKanbanVendas) => void
  modoVisualizacao: ModoVisualizacaoKanban
  onModoVisualizacaoChange: (value: ModoVisualizacaoKanban) => void
}) {
  const [refreshSpinning, setRefreshSpinning] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRefreshSpinning(true)
          void Promise.resolve(onRefresh()).finally(() => setRefreshSpinning(false))
        }}
        className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
        title="Atualizar listagem"
        aria-label="Atualizar listagem do kanban"
      >
        <MdRefresh className={`h-5 w-5 ${refreshSpinning ? 'animate-spin' : ''}`} />
      </button>
      <CompartilharCardapioPublicoButton />
      <button
        type="button"
        onClick={onAbrirCaixaEstacao}
        className="flex min-w-max shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
        title={
          caixaAberta === true
            ? 'Caixa aberto'
            : caixaAberta === false
              ? 'Caixa fechado'
              : 'Meu caixa da estação'
        }
        aria-label="Abrir meu caixa"
      >
        <TbCashRegister
          className={`h-5 w-5 ${caixaAberta === true ? 'text-green-500' : caixaAberta === false ? 'text-red-500' : 'text-gray-600'}`}
        />
        Meu Caixa
      </button>
      {noFredy ? (
        <KanbanModoVisualizacaoSelect
          value={modoVisualizacao}
          onChange={onModoVisualizacaoChange}
        />
      ) : null}
      {noFredy ? null : (
        <KanbanModoVendasToggle value={modoKanbanVendas} onChange={onModoKanbanVendasChange} />
      )}
    </>
  )
}
