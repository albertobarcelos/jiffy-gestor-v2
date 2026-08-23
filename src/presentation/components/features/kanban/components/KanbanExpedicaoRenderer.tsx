'use client'

import { MdWarningAmber } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { contarPendenciasExpedicao, montarLayoutExpedicao } from '../utils/kanbanExpedicaoLayout'
import { useAgoraKanban } from '../hooks/useAgoraKanban'
import type { ColunaKanbanId, KanbanColumn, Venda } from '../types'
import type { KanbanBoardRendererProps } from './KanbanBoardRenderer'
import { KanbanExpedicaoCard } from './KanbanExpedicaoCard'

function RodapeCarregando({
  columnId,
  isModoDeliveryKanban,
  deliveryKanban,
  balcaoKanban,
}: Pick<
  KanbanBoardRendererProps,
  'isModoDeliveryKanban' | 'deliveryKanban' | 'balcaoKanban'
> & { columnId: ColunaKanbanId }) {
  const carregando = isModoDeliveryKanban
    ? Boolean(deliveryKanban.columnStates[columnId]?.isFetchingNextPage)
    : Boolean(
        balcaoKanban.columnStates[columnId as keyof typeof balcaoKanban.columnStates]
          ?.isFetchingNextPage
      )
  if (!carregando) return null
  return <p className="py-2 text-center text-xs text-gray-500">Carregando mais vendas…</p>
}

function CabecalhoBloco({
  column,
  count,
  pendencias,
}: {
  column: KanbanColumn
  count: number
  pendencias: number
}) {
  return (
    <div className="flex items-center gap-2 px-1 pb-2">
      <h3 className="text-sm font-bold text-gray-900">{column.title}</h3>
      <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
        {count}
      </span>
      {pendencias > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
          <MdWarningAmber className="h-3.5 w-3.5" />
          {pendencias} {pendencias === 1 ? 'pendência' : 'pendências'}
        </span>
      ) : null}
    </div>
  )
}

export function KanbanExpedicaoRenderer(props: KanbanBoardRendererProps) {
  const {
    columns,
    mostrarLoadingLista,
    vendasPorColuna,
    getColumnTotalCount,
    onColumnScroll,
    avancandoEtapaIds,
    onViewDetails,
    onAvancarEtapa,
  } = props
  const agoraMs = useAgoraKanban()
  const { primaria, secundarias } = montarLayoutExpedicao(columns)

  if (mostrarLoadingLista) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (!primaria) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-500">
        Nenhuma coluna visível.
      </div>
    )
  }

  const renderCards = (column: KanbanColumn, densidade: 'principal' | 'secundaria') => {
    const colId = column.id as ColunaKanbanId
    const vendas = vendasPorColuna[colId] ?? []
    if (vendas.length === 0) {
      return <p className="px-1 py-6 text-center text-xs text-gray-400">{column.placeholder}</p>
    }
    return vendas.map((venda: Venda) => (
      <KanbanExpedicaoCard
        key={venda.id}
        venda={venda}
        colunaId={colId}
        agoraMs={agoraMs}
        densidade={densidade}
        avancando={Boolean(avancandoEtapaIds[venda.id])}
        onViewDetails={onViewDetails}
        onAvancarEtapa={onAvancarEtapa}
      />
    ))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-2 py-2 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-gray-100">
        <CabecalhoBloco
          column={primaria}
          count={getColumnTotalCount(primaria.id as ColunaKanbanId)}
          pendencias={contarPendenciasExpedicao(
            vendasPorColuna[primaria.id as ColunaKanbanId] ?? [],
            agoraMs
          )}
        />
        <div
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1"
          onScroll={event => onColumnScroll(primaria.id as ColunaKanbanId, event)}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))] gap-2">
            {renderCards(primaria, 'principal')}
          </div>
          <RodapeCarregando columnId={primaria.id as ColunaKanbanId} {...props} />
        </div>
      </section>

      {secundarias.length > 0 ? (
        <div className="flex min-h-0 w-full flex-col gap-3 lg:w-[34%] lg:min-w-[18rem]">
          {secundarias.map(column => {
            const colId = column.id as ColunaKanbanId
            return (
              <section
                key={column.id}
                className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-gray-100"
              >
                <CabecalhoBloco
                  column={column}
                  count={getColumnTotalCount(colId)}
                  pendencias={contarPendenciasExpedicao(vendasPorColuna[colId] ?? [], agoraMs)}
                />
                <div
                  className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1"
                  onScroll={event => onColumnScroll(colId, event)}
                >
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
                    {renderCards(column, 'secundaria')}
                  </div>
                  <RodapeCarregando columnId={colId} {...props} />
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
