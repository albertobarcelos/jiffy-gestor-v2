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
  return <p className="py-1 text-center text-[11px] text-gray-500">Carregando mais vendas…</p>
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
    <div className="flex items-center gap-1.5 px-0.5 pb-1.5">
      <h3 className="text-[13px] font-bold text-gray-900">{column.title}</h3>
      <span className="rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-semibold text-gray-700">
        {count}
      </span>
      {pendencias > 0 ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-px text-[10px] font-semibold text-red-700">
          <MdWarningAmber className="h-3 w-3" />
          {pendencias} atenção
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
  const { primaria, laterais, arquivo } = montarLayoutExpedicao(columns)

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

  const renderCards = (column: KanbanColumn) => {
    const colId = column.id as ColunaKanbanId
    const vendas = vendasPorColuna[colId] ?? []
    if (vendas.length === 0) {
      return <p className="px-1 py-4 text-center text-[11px] text-gray-400">{column.placeholder}</p>
    }
    return vendas.map((venda: Venda) => (
      <KanbanExpedicaoCard
        key={venda.id}
        venda={venda}
        colunaId={colId}
        agoraMs={agoraMs}
        avancando={Boolean(avancandoEtapaIds[venda.id])}
        onViewDetails={onViewDetails}
        onAvancarEtapa={onAvancarEtapa}
      />
    ))
  }

  const blocoColuna = (column: KanbanColumn, grelha: string, flexGrow: boolean) => {
    const colId = column.id as ColunaKanbanId
    return (
      <section
        key={column.id}
        className={`flex min-h-0 min-w-0 flex-col rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-gray-100 ${
          flexGrow ? 'flex-1' : 'max-h-[30%] min-h-[6.5rem] shrink-0'
        }`}
      >
        <CabecalhoBloco
          column={column}
          count={getColumnTotalCount(colId)}
          pendencias={
            column.id === 'FINALIZADAS'
              ? 0
              : contarPendenciasExpedicao(vendasPorColuna[colId] ?? [], agoraMs)
          }
        />
        <div
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
          onScroll={event => onColumnScroll(colId, event)}
        >
          <div className={grelha}>{renderCards(column)}</div>
          <RodapeCarregando columnId={colId} {...props} />
        </div>
      </section>
    )
  }

  const grelhaProducao = 'grid grid-cols-[repeat(auto-fill,minmax(9.25rem,1fr))] gap-2'
  const grelhaLateral = 'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2 py-2 lg:flex-row">
      {blocoColuna(primaria, grelhaProducao, true)}

      {laterais.length > 0 || arquivo ? (
        <div className="flex min-h-0 w-full flex-col gap-2 lg:w-[34%] lg:min-w-[17.5rem] lg:max-w-[26rem]">
          {laterais.map(column => blocoColuna(column, grelhaLateral, true))}
          {arquivo ? blocoColuna(arquivo, grelhaLateral, false) : null}
        </div>
      ) : null}
    </div>
  )
}
