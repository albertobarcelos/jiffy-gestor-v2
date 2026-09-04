'use client'

import { useEffect, useState } from 'react'
import { MdExpandLess, MdExpandMore } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  classeDestaquePagamentoKanban,
  nomeClienteCurtoKanban,
  rotuloStatusFinanceiroKanban,
  rotuloTipoAtendimentoKanban,
  tipoAtendimentoKanban,
} from '../utils/kanbanPedidoIdentidade'
import { relogioPedidoKanban } from '../utils/kanbanPedidoTempo'
import { useAgoraKanban } from '../hooks/useAgoraKanban'
import { classeBordaEsquerdaColunaKanban } from '../rules/vendasKanban.rules'
import type { ColunaKanbanId, KanbanColumn, Venda } from '../types'
import type { KanbanBoardRendererProps } from './KanbanBoardRenderer'
import { KanbanAvancarEtapaCompacto } from './KanbanAvancarEtapaCompacto'

function blocoInicialmenteAberto(
  columns: readonly KanbanColumn[],
  vendasPorColuna: Partial<Record<ColunaKanbanId, Venda[]>>
): Record<string, boolean> {
  const primeiroComItem = columns.find(
    coluna => (vendasPorColuna[coluna.id as ColunaKanbanId] ?? []).length > 0
  )
  const abertoId = primeiroComItem?.id ?? columns[0]?.id
  return Object.fromEntries(columns.map(coluna => [coluna.id, coluna.id === abertoId]))
}

function classeTomTempo(tom: ReturnType<typeof relogioPedidoKanban>['tom']): string {
  if (tom === 'atraso') return 'font-semibold text-red-600'
  if (tom === 'alerta') return 'font-semibold text-amber-700'
  return 'text-gray-600'
}

export function KanbanListaRenderer(props: KanbanBoardRendererProps) {
  const {
    columns,
    mostrarLoadingLista,
    vendasPorColuna,
    getColumnTotalCount,
    onColumnScroll,
    avancandoEtapaIds,
    onViewDetails,
    onAvancarEtapa,
    isModoDeliveryKanban,
    deliveryKanban,
    balcaoKanban,
  } = props
  const agoraMs = useAgoraKanban()
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    blocoInicialmenteAberto(columns, vendasPorColuna)
  )

  useEffect(() => {
    setAbertos(atual => {
      const proximo = { ...atual }
      let mudou = false
      for (const coluna of columns) {
        if (proximo[coluna.id] === undefined) {
          proximo[coluna.id] = false
          mudou = true
        }
      }
      return mudou ? proximo : atual
    })
  }, [columns])

  if (mostrarLoadingLista) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2">
      {columns.map(column => {
        const colId = column.id as ColunaKanbanId
        const vendas = vendasPorColuna[colId] ?? []
        const aberto = abertos[column.id] !== false
        const count = getColumnTotalCount(colId)
        const carregando = isModoDeliveryKanban
          ? Boolean(deliveryKanban.columnStates[colId]?.isFetchingNextPage)
          : Boolean(
              balcaoKanban.columnStates[colId as keyof typeof balcaoKanban.columnStates]
                ?.isFetchingNextPage
            )

        return (
          <section
            key={column.id}
            className={`overflow-hidden rounded-2xl border border-gray-200 border-l-4 bg-white shadow-sm ${classeBordaEsquerdaColunaKanban(colId)}`}
          >
            <button
              type="button"
              onClick={() =>
                setAbertos(atual => ({ ...atual, [column.id]: !aberto }))
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              aria-expanded={aberto}
            >
              <span className="text-base font-bold text-gray-900">{column.title}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {count}
              </span>
              <span className="ml-auto text-gray-400">
                {aberto ? <MdExpandLess className="h-6 w-6" /> : <MdExpandMore className="h-6 w-6" />}
              </span>
            </button>

            {aberto ? (
              <div
                className="max-h-[min(28rem,55vh)] overflow-y-auto border-t border-gray-100"
                onScroll={event => onColumnScroll(colId, event)}
              >
                {vendas.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">{column.placeholder}</p>
                ) : (
                  <table className="w-full min-w-[40rem] border-collapse text-left">
                    <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm">
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2">Pedido</th>
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Tempo</th>
                        <th className="px-3 py-2 text-gray-800">Pagamento</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-4 py-2 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendas.map((venda: Venda) => {
                        const relogio = relogioPedidoKanban(venda, agoraMs)
                        const tipo = tipoAtendimentoKanban(venda.tipoVenda)
                        const cancelada = venda.isCancelada()
                        return (
                          <tr
                            key={venda.id}
                            onClick={() => onViewDetails(venda)}
                            className={`cursor-pointer border-t border-gray-100 transition-colors hover:bg-violet-50/40 ${
                              cancelada ? 'opacity-60' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="flex items-baseline gap-1.5 leading-none">
                                <span className="text-xl font-bold tabular-nums text-gray-900">
                                  {venda.numeroVenda}
                                </span>
                                {venda.codigoVenda ? (
                                  <span className="text-xs font-medium text-gray-500">
                                    #{venda.codigoVenda}
                                  </span>
                                ) : null}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-sm font-medium text-gray-800">
                              {nomeClienteCurtoKanban(venda.cliente?.nome)}
                            </td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                {rotuloTipoAtendimentoKanban(tipo)}
                              </span>
                            </td>
                            <td className={`px-3 py-3 text-sm ${classeTomTempo(relogio.tom)}`}>
                              {relogio.rotuloAtraso ?? relogio.rotuloHa ?? '—'}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${classeDestaquePagamentoKanban(venda.statusFinanceiro)}`}
                              >
                                {rotuloStatusFinanceiroKanban(venda.statusFinanceiro)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                              {transformarParaReal(venda.valorFinal)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {cancelada || colId === 'FINALIZADAS' ? (
                                <span
                                  className={`text-xs font-semibold ${
                                    cancelada ? 'text-red-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {cancelada ? 'Cancelado' : 'Concluído'}
                                </span>
                              ) : (
                                <KanbanAvancarEtapaCompacto
                                  venda={venda}
                                  colunaAtual={colId}
                                  avancando={Boolean(avancandoEtapaIds[venda.id])}
                                  onAvancar={onAvancarEtapa}
                                />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                {carregando ? (
                  <p className="py-2 text-center text-xs text-gray-500">Carregando mais vendas…</p>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
