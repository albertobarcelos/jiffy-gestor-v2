'use client'

import { EmitirNfeModal } from '../../fiscal/EmitirNfeModal'
import { NovoPedidoModal } from '../../pedidos/NovoPedidoModal'
import { DeliveryConfiguracoesModal } from '../../delivery/configuracoes/DeliveryConfiguracoesModal'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { VendaSelecionadaParaEmissao } from '../hooks/useFiscalEmissaoKanban'
import type { TipoPedido } from '../../pedidos/components/EscolhaTipoPedidoModal'
import type { AbaDetalhesPedido } from '../../pedidos/types'
import type { Venda } from '../types'
import type { DateRange } from 'react-day-picker'

export interface KanbanModaisRendererProps {
  timezoneAgregacao: string
  modalPeriodoDatasAberto: boolean
  onCloseModalPeriodoDatas: () => void
  rascunhoPeriodoRange: DateRange | undefined
  onRascunhoPeriodoRangeChange: (range: DateRange | undefined) => void
  mesCalendarioPeriodo: Date
  onMesCalendarioPeriodoChange: (month: Date) => void
  rascunhoHoraPeriodoInicio: string
  rascunhoHoraPeriodoFim: string
  onHorariosPeriodoChange: (horaInicio: string, horaFim: string) => void
  onAplicarPeriodoDatas: () => void
  deliveryConfiguracoesOpen: boolean
  onCloseDeliveryConfiguracoes: () => void
  vendaSelecionadaParaEmissao: VendaSelecionadaParaEmissao | null
  emitirNfeModalOpen: boolean
  onCloseEmitirNfe: () => void
  onClienteSalvoEmitirNfe: () => void
  novoPedidoCriarContext: { instanciaKey: number; tipoInicioPedido: TipoPedido } | null
  novoPedidoModalOpen: boolean
  onCloseNovoPedidoCriar: () => void
  onAfterCloseNovoPedidoCriar: () => void
  onSuccessNovoPedidoCriar: () => void
  pedidoEdicaoProdutosContext: {
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
    tipoVenda?: string | null
  } | null
  novoPedidoModalEdicaoProdutosOpen: boolean
  onCloseEdicaoProdutos: () => void
  onAfterCloseEdicaoProdutos: () => void
  onSuccessEdicaoProdutos: () => void
  pedidoVisualizacaoContext: {
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
    tipoVenda?: string | null
    abaDetalhesInicial?: AbaDetalhesPedido
  } | null
  novoPedidoModalVisualizacaoOpen: boolean
  onCloseVisualizacao: () => void
  onAfterCloseVisualizacao: () => void
  onSuccessVisualizacao: () => void
  modoKanbanVendas: ModoKanbanVendas
}

export function KanbanModaisRenderer({
  timezoneAgregacao,
  modalPeriodoDatasAberto,
  onCloseModalPeriodoDatas,
  rascunhoPeriodoRange,
  onRascunhoPeriodoRangeChange,
  mesCalendarioPeriodo,
  onMesCalendarioPeriodoChange,
  rascunhoHoraPeriodoInicio,
  rascunhoHoraPeriodoFim,
  onHorariosPeriodoChange,
  onAplicarPeriodoDatas,
  deliveryConfiguracoesOpen,
  onCloseDeliveryConfiguracoes,
  vendaSelecionadaParaEmissao,
  emitirNfeModalOpen,
  onCloseEmitirNfe,
  onClienteSalvoEmitirNfe,
  novoPedidoCriarContext,
  novoPedidoModalOpen,
  onCloseNovoPedidoCriar,
  onAfterCloseNovoPedidoCriar,
  onSuccessNovoPedidoCriar,
  pedidoEdicaoProdutosContext,
  novoPedidoModalEdicaoProdutosOpen,
  onCloseEdicaoProdutos,
  onAfterCloseEdicaoProdutos,
  onSuccessEdicaoProdutos,
  pedidoVisualizacaoContext,
  novoPedidoModalVisualizacaoOpen,
  onCloseVisualizacao,
  onAfterCloseVisualizacao,
  onSuccessVisualizacao,
  modoKanbanVendas,
}: KanbanModaisRendererProps) {
  return (
    <>
      {deliveryConfiguracoesOpen ? (
        <DeliveryConfiguracoesModal open onClose={onCloseDeliveryConfiguracoes} />
      ) : null}

      <JiffySidePanelModal
        open={modalPeriodoDatasAberto}
        onClose={onCloseModalPeriodoDatas}
        title="Escolha o período"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoPeriodoRange?.from || !rascunhoPeriodoRange?.to}
            onClick={onAplicarPeriodoDatas}
            className="rounded-b-l-lg font-nunito flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
          </button>
        }
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-stretch justify-start overflow-x-auto overflow-y-auto">
          <FaturamentoRangeCalendar
            embutidoNoModal
            embutidoFundoClaro
            range={rascunhoPeriodoRange}
            onRangeChange={onRascunhoPeriodoRangeChange}
            month={mesCalendarioPeriodo}
            onMonthChange={onMesCalendarioPeriodoChange}
            timeZoneEmpresa={timezoneAgregacao}
            horaInicio={rascunhoHoraPeriodoInicio}
            horaFim={rascunhoHoraPeriodoFim}
            onHorariosChange={onHorariosPeriodoChange}
          />
        </div>
      </JiffySidePanelModal>

      {vendaSelecionadaParaEmissao && (
        <EmitirNfeModal
          open={emitirNfeModalOpen}
          onClose={onCloseEmitirNfe}
          vendaId={vendaSelecionadaParaEmissao.id}
          vendaNumero={vendaSelecionadaParaEmissao.numeroVenda?.toString()}
          origemVenda={vendaSelecionadaParaEmissao.origemVenda}
          codigoVenda={vendaSelecionadaParaEmissao.codigoVenda}
          clienteId={vendaSelecionadaParaEmissao.clienteId}
          clienteNome={vendaSelecionadaParaEmissao.clienteNome}
          tabelaOrigem={vendaSelecionadaParaEmissao.tabelaOrigem}
          tipoVenda={vendaSelecionadaParaEmissao.tipoVenda}
          onClienteSalvo={onClienteSalvoEmitirNfe}
        />
      )}

      {novoPedidoCriarContext && (
        <NovoPedidoModal
          key={novoPedidoCriarContext.instanciaKey}
          open={novoPedidoModalOpen}
          tipoInicioPedido={novoPedidoCriarContext.tipoInicioPedido}
          onClose={onCloseNovoPedidoCriar}
          onAfterClose={onAfterCloseNovoPedidoCriar}
          onSuccess={onSuccessNovoPedidoCriar}
        />
      )}

      {pedidoEdicaoProdutosContext && (
        <NovoPedidoModal
          open={novoPedidoModalEdicaoProdutosOpen}
          onClose={onCloseEdicaoProdutos}
          onAfterClose={onAfterCloseEdicaoProdutos}
          onSuccess={onSuccessEdicaoProdutos}
          vendaId={pedidoEdicaoProdutosContext.id}
          tabelaOrigemVenda={pedidoEdicaoProdutosContext.tabelaOrigem}
          statusFiscalUnificado={pedidoEdicaoProdutosContext.statusFiscal}
          tipoVendaGestor={pedidoEdicaoProdutosContext.tipoVenda}
          tipoInicioPedido="entrega"
          modoEdicaoProdutos={true}
        />
      )}

      {pedidoVisualizacaoContext && (
        <NovoPedidoModal
          open={novoPedidoModalVisualizacaoOpen}
          onClose={onCloseVisualizacao}
          onAfterClose={onAfterCloseVisualizacao}
          onSuccess={onSuccessVisualizacao}
          vendaId={pedidoVisualizacaoContext.id}
          tabelaOrigemVenda={pedidoVisualizacaoContext.tabelaOrigem}
          statusFiscalUnificado={pedidoVisualizacaoContext.statusFiscal}
          tipoVendaGestor={pedidoVisualizacaoContext.tipoVenda}
          tipoInicioPedido={
            modoKanbanVendas === 'delivery' ||
            pedidoVisualizacaoContext.tipoVenda === 'entrega' ||
            pedidoVisualizacaoContext.tipoVenda === 'retirada'
              ? 'entrega'
              : 'balcao'
          }
          abaDetalhesInicial={pedidoVisualizacaoContext.abaDetalhesInicial}
          modoVisualizacao={true}
        />
      )}
    </>
  )
}
