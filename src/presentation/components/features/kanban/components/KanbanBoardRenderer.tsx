'use client'

import { DndContext, DragOverlay, type SensorDescriptor, type SensorOptions } from '@dnd-kit/core'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { definirEntregadorKanbanCache } from '../../delivery/kanban-panels/entregadorKanbanStore'
import { KanbanColuna } from './KanbanColuna'
import { KanbanReemissaoEmLoteBar } from './KanbanReemissaoEmLoteBar'
import { KanbanVendaCard } from './KanbanVendaCard'
import { VendaCardDragPreview } from './VendaCardDragPreview'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
  KanbanColumn,
  Venda,
} from '../types'
import type { usePedidosDeliveryKanbanColumns } from '../hooks/usePedidosDeliveryKanbanColumns'
import type { useVendasUnificadasKanbanColumns } from '../hooks/useVendasUnificadasKanbanColumns'
import type { useReemissaoFiscalEmLote } from '../hooks/useReemissaoFiscalEmLote'

type DeliveryKanbanReturn = ReturnType<typeof usePedidosDeliveryKanbanColumns>
type BalcaoKanbanReturn = ReturnType<typeof useVendasUnificadasKanbanColumns>
type ReemissaoEmLoteReturn = ReturnType<typeof useReemissaoFiscalEmLote>

export interface KanbanBoardRendererProps {
  columns: KanbanColumn[]
  mostrarLoadingLista: boolean
  isModoDeliveryKanban: boolean
  modoKanbanVendas: ModoKanbanVendas
  sensors: SensorDescriptor<SensorOptions>[]
  draggingVenda: Venda | null
  onDragStart: (event: import('@dnd-kit/core').DragStartEvent) => void
  onDragEnd: (event: import('@dnd-kit/core').DragEndEvent) => void
  onDragCancel: () => void
  vendasPorColuna: Partial<Record<ColunaKanbanId, Venda[]>>
  getColumnTotalCount: (columnId: ColunaKanbanId) => number
  criterioOrdenacaoPorColuna: Record<ColunaKanbanId, CriterioOrdenacaoKanban>
  direcaoOrdenacaoPorColuna: Record<ColunaKanbanId, DirecaoOrdenacaoKanban>
  onCriterioOrdenacaoChange: (columnId: ColunaKanbanId, criterio: CriterioOrdenacaoKanban) => void
  onToggleDirecaoOrdenacao: (columnId: ColunaKanbanId) => void
  onColumnScroll: (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => void
  deliveryKanban: DeliveryKanbanReturn
  balcaoKanban: BalcaoKanbanReturn
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  avancandoEtapaIds: Record<string, boolean>
  timestampsEtapaEntregaLocal: Record<string, string>
  onViewDetails: (venda: Venda) => void
  onEditarProdutos?: (venda: Venda) => void
  onAvancarEtapa: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  onEmitirNfe: (venda: Venda) => void
  onReimprimirCupomDelivery?: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  entregadorPorVendaId: Record<string, string>
  vendaIdAbrirEntregador: string | null
  onAbrirEntregadorConsumido: () => void
  onEntregadorAtualizado: (vendaId: string, entregadorId: string | null) => void
  onConfirmarCobranca?: (venda: Venda) => void
  nomesMeiosPagamento: Record<string, string>
  reemissaoEmLote?: ReemissaoEmLoteReturn
}

export function KanbanBoardRenderer({
  columns,
  mostrarLoadingLista,
  isModoDeliveryKanban,
  modoKanbanVendas,
  sensors,
  draggingVenda,
  onDragStart,
  onDragEnd,
  onDragCancel,
  vendasPorColuna,
  getColumnTotalCount,
  criterioOrdenacaoPorColuna,
  direcaoOrdenacaoPorColuna,
  onCriterioOrdenacaoChange,
  onToggleDirecaoOrdenacao,
  onColumnScroll,
  deliveryKanban,
  balcaoKanban,
  acaoFiscalEmAndamentoPorVenda,
  avancandoEtapaIds,
  timestampsEtapaEntregaLocal,
  onViewDetails,
  onEditarProdutos,
  onAvancarEtapa,
  onEmitirNfe,
  onReimprimirCupomDelivery,
  entregadorPorVendaId,
  vendaIdAbrirEntregador,
  onAbrirEntregadorConsumido,
  onEntregadorAtualizado,
  onConfirmarCobranca,
  nomesMeiosPagamento,
  reemissaoEmLote,
}: KanbanBoardRendererProps) {
  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-x-auto px-2 py-2">
      {mostrarLoadingLista ? (
        <div className="flex h-full min-h-[200px] items-center justify-center">
          <JiffyLoading />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <div className="flex h-full min-h-0 min-w-max flex-1 gap-3">
            {columns.map(column => {
              const colId = column.id as ColunaKanbanId
              const columnTotalCount = getColumnTotalCount(colId)
              const columnVendas = vendasPorColuna[colId] ?? []

              return (
                <KanbanColuna
                  key={column.id}
                  column={column}
                  count={columnTotalCount}
                  criterioOrdenacao={criterioOrdenacaoPorColuna[colId] ?? 'data'}
                  direcaoOrdenacao={direcaoOrdenacaoPorColuna[colId] ?? 'desc'}
                  onCriterioOrdenacaoChange={onCriterioOrdenacaoChange}
                  onToggleDirecaoOrdenacao={onToggleDirecaoOrdenacao}
                  onColumnScroll={onColumnScroll}
                  columnRodape={
                    colId === 'PENDENTE_EMISSAO' &&
                    reemissaoEmLote?.exibirBarraReemissaoEmLote ? (
                      <KanbanReemissaoEmLoteBar
                        totalElegiveis={reemissaoEmLote.totalElegiveisVisiveis}
                        progresso={reemissaoEmLote.progresso}
                        intervaloSegundos={reemissaoEmLote.intervaloSegundos}
                        confirmacaoAberta={reemissaoEmLote.confirmacaoAberta}
                        onConfirmacaoAbertaChange={reemissaoEmLote.setConfirmacaoAberta}
                        onIniciar={reemissaoEmLote.iniciar}
                        onConfirmarInicio={reemissaoEmLote.confirmarInicio}
                        onPausar={reemissaoEmLote.pausar}
                        onRetomar={reemissaoEmLote.retomar}
                        onParar={reemissaoEmLote.parar}
                        onEncerrarResumo={reemissaoEmLote.encerrarResumo}
                      />
                    ) : undefined
                  }
                  columnFooter={
                    isModoDeliveryKanban &&
                    deliveryKanban.columnStates[colId]?.isFetchingNextPage ? (
                      <p className="py-2 text-center text-xs text-gray-500">
                        Carregando mais vendas…
                      </p>
                    ) : !isModoDeliveryKanban &&
                      balcaoKanban.columnStates[colId as keyof typeof balcaoKanban.columnStates]
                        ?.isFetchingNextPage ? (
                      <p className="py-2 text-center text-xs text-gray-500">
                        Carregando mais vendas…
                      </p>
                    ) : undefined
                  }
                >
                  {columnVendas.map((venda: Venda) => (
                    <KanbanVendaCard
                      key={venda.id}
                      venda={venda}
                      column={column}
                      modoKanbanVendas={modoKanbanVendas}
                      acaoFiscalEmAndamentoPorVenda={acaoFiscalEmAndamentoPorVenda}
                      avancandoEtapaIds={avancandoEtapaIds}
                      timestampsEtapaEntregaLocal={timestampsEtapaEntregaLocal}
                      onViewDetails={onViewDetails}
                      onEditarProdutos={onEditarProdutos}
                      onAvancarEtapa={onAvancarEtapa}
                      onEmitirNfe={onEmitirNfe}
                      onReimprimirCupomDelivery={onReimprimirCupomDelivery}
                      entregadorVinculadoId={
                        entregadorPorVendaId[venda.id] ?? venda.entregador?.id ?? null
                      }
                      abrirEntregadorSolicitado={vendaIdAbrirEntregador === venda.id}
                      onAbrirEntregadorConsumido={onAbrirEntregadorConsumido}
                      onEntregadorAtualizado={(vendaId, entregadorId) => {
                        definirEntregadorKanbanCache(vendaId, entregadorId)
                        onEntregadorAtualizado(vendaId, entregadorId)
                      }}
                      onConfirmarCobranca={onConfirmarCobranca}
                      nomesMeiosPagamento={nomesMeiosPagamento}
                    />
                  ))}
                </KanbanColuna>
              )
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {draggingVenda ? <VendaCardDragPreview venda={draggingVenda} /> : null}
          </DragOverlay>
        </DndContext>
        </div>
      )}
    </div>
  )
}
