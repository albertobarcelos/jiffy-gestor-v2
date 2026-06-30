'use client'

import { transformarParaReal } from '@/src/shared/utils/formatters'
import { textoFromObservacoesApi } from '@/src/shared/helpers/observacaoPedido'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import { DraggableVendaCard } from './DraggableVendaCard'
import { KanbanVendaCardHeader } from './KanbanVendaCardHeader'
import { KanbanVendaCardActions } from './KanbanVendaCardActions'
import {
  formatarFormaPagamentoKanbanCard,
  formatarPrevisaoEntregaKanbanCard,
  rotuloFormaCobrancaKanbanCard,
} from '../utils/kanbanDeliveryCardDisplay'
import {
  derivarTipoVendaCardKanban,
  linhaIdentificacaoVendaKanban,
} from '../utils/kanbanVendaCardViewModel'
import { useKanbanVendaCardState } from '../hooks/useKanbanVendaCardState'
import { PedidoEntregaQuickViewPopover } from '../../delivery/kanban-panels/PedidoEntregaQuickViewPopover'
import { AtribuirEntregadorKanbanPainel } from '../../delivery/kanban-panels/AtribuirEntregadorKanbanPainel'
import { ObservacaoPedidoKanbanPainel } from '../../delivery/kanban-panels/ObservacaoPedidoKanbanPainel'
import { EnderecoEntregaPedidoKanbanPainel } from '../../delivery/kanban-panels/EnderecoEntregaPedidoKanbanPainel'
import {
  deveExibirAcaoAlterarTipoPedidoKanban,
  deveExibirBotaoAlterarEnderecoEntregaKanban,
} from '../../delivery/kanban-panels/enderecoEntregaPedidoKanban'
import type { ColunaKanbanId, KanbanColumn, Venda } from '../types'
import {
  LABEL_SEM_CLIENTE,
  colunaParaEstiloCardKanban,
  deveExibirBotaoObservacaoPedidoKanban,
  deveExibirBotaoSalvarCobrancaKanban,
  etapaKanbanCardComAcaoFiscal,
  exibirAtribuirEntregadorKanban,
  formatarDataCard,
  getCardBorderEFundoKanban,
  getLinhaTempoPedidoEntregaKanban,
  podeEditarProdutosNaKanbanCard,
} from '../rules/vendasKanban.rules'

export interface KanbanVendaCardProps {
  venda: Venda
  column: KanbanColumn
  modoKanbanVendas: ModoKanbanVendas
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  avancandoEtapaIds: Record<string, boolean>
  timestampsEtapaEntregaLocal: Record<string, string>
  onViewDetails: (venda: Venda) => void
  /** Abre o pedido em modo edição de produtos (etapas anteriores a Em Rota). */
  onEditarProdutos?: (venda: Venda) => void
  onAvancarEtapa: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  onEmitirNfe: (venda: Venda) => void
  /** Modo delivery: reimprime cupom (mesmo layout da automática). */
  onReimprimirCupomDelivery?: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  entregadorVinculadoId?: string | null
  onEntregadorAtualizado?: (vendaId: string, entregadorId: string | null) => void
  /** Sinal externo (ex.: arraste para Em rota sem entregador) para abrir o modal de entregador. */
  abrirEntregadorSolicitado?: boolean
  /** Chamado após consumir o sinal de abertura (reseta o estado no pai). */
  onAbrirEntregadorConsumido?: () => void
  /** Abre o modal de detalhes na guia de pagamento para confirmar a cobrança (coluna Em Rota). */
  onConfirmarCobranca?: (venda: Venda) => void
  nomesMeiosPagamento?: Record<string, string>
}

export function KanbanVendaCard(props: KanbanVendaCardProps) {
  const {
    venda,
    column,
    modoKanbanVendas,
    acaoFiscalEmAndamentoPorVenda,
    avancandoEtapaIds,
    timestampsEtapaEntregaLocal,
    onViewDetails,
    onEditarProdutos,
    onAvancarEtapa,
    onEmitirNfe,
    onReimprimirCupomDelivery,
    entregadorVinculadoId = null,
    onEntregadorAtualizado,
    abrirEntregadorSolicitado = false,
    onAbrirEntregadorConsumido,
    onConfirmarCobranca,
    nomesMeiosPagamento = {},
  } = props

  const colunaAtual = column.id as ColunaKanbanId
  const tipoVendaView = derivarTipoVendaCardKanban(venda)
  const etapaKanbanCard = etapaKanbanCardComAcaoFiscal(venda, acaoFiscalEmAndamentoPorVenda)
  const colunaIdParaEstiloCard = colunaParaEstiloCardKanban(
    colunaAtual,
    etapaKanbanCard,
    modoKanbanVendas
  )
  const { borderClass: cardBorderClass, cardBgClass } = getCardBorderEFundoKanban(
    colunaIdParaEstiloCard,
    venda,
    acaoFiscalEmAndamentoPorVenda
  )

  const exibirAtribuirEntregador = exibirAtribuirEntregadorKanban(
    modoKanbanVendas,
    venda,
    colunaAtual
  )
  const entregadorJaVinculado = Boolean(entregadorVinculadoId?.trim())

  const cardState = useKanbanVendaCardState({
    abrirEntregadorSolicitado,
    exibirAtribuirEntregador,
    onAbrirEntregadorConsumido,
  })

  const valorFormatado = transformarParaReal(venda.valorFinal)
  const clienteNome = venda.cliente?.nome?.trim() ? venda.cliente.nome : LABEL_SEM_CLIENTE
  const observacaoPedidoTexto = textoFromObservacoesApi(venda.observacoes)

  const exibirQuickViewEntrega = venda.isPedidoEntregaGestor()
  const tabelaOrigemQuickView =
    venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda'
  const tipoVendaQuickView =
    (venda.tipoVenda ?? '').trim().toLowerCase() === 'retirada' ? 'retirada' : 'entrega'

  const exibirBotaoObservacaoPedido = deveExibirBotaoObservacaoPedidoKanban(
    colunaAtual,
    venda,
    modoKanbanVendas
  )
  const exibirBotaoAlterarEndereco = deveExibirBotaoAlterarEnderecoEntregaKanban(
    colunaAtual,
    venda,
    modoKanbanVendas
  )
  const exibirBotaoEditarProdutos =
    Boolean(onEditarProdutos) &&
    podeEditarProdutosNaKanbanCard(colunaAtual, venda, modoKanbanVendas)
  const exibirAcaoAlterarTipoPedido = deveExibirAcaoAlterarTipoPedidoKanban(
    colunaAtual,
    venda,
    modoKanbanVendas
  )
  const exibirBotaoSalvarCobranca = deveExibirBotaoSalvarCobrancaKanban(
    colunaAtual,
    venda,
    modoKanbanVendas
  )
  const exibirMetaDeliveryKanban =
    modoKanbanVendas === 'delivery' && venda.isPedidoEntregaGestor()
  const previsaoEntregaKanban = exibirMetaDeliveryKanban
    ? formatarPrevisaoEntregaKanbanCard(venda)
    : null
  const formaCobrancaKanban = exibirMetaDeliveryKanban
    ? rotuloFormaCobrancaKanbanCard(venda.tipoVenda, venda.fluxoPagamentoEntrega)
    : null
  const formaPagamentoKanban = exibirMetaDeliveryKanban
    ? formatarFormaPagamentoKanbanCard(venda.cobrancasDelivery, nomesMeiosPagamento)
    : null

  const linhaTempo = getLinhaTempoPedidoEntregaKanban(
    colunaAtual,
    venda,
    timestampsEtapaEntregaLocal[venda.id]
  )

  return (
    <DraggableVendaCard
      venda={venda}
      column={column}
      dragDisabled={cardState.bloquearDragCard}
    >
      <div
        className={`relative rounded-lg border-l-4 ${cardBorderClass} ${cardBgClass} cursor-pointer border border-gray-200/80 p-3 transition-all hover:shadow-md`}
        onClick={() => onViewDetails(venda)}
        onDoubleClick={() => onViewDetails(venda)}
      >
        <div className={`mb-2 ${exibirBotaoEditarProdutos ? 'pr-1' : ''}`}>
          <KanbanVendaCardHeader
            venda={venda}
            exibirMetaDeliveryKanban={exibirMetaDeliveryKanban}
            linhaIdentificacaoVenda={linhaIdentificacaoVendaKanban(venda)}
            prefixoLinhaOrigemCard={tipoVendaView.prefixoLinhaOrigemCard}
            clienteNome={clienteNome}
            valorFormatado={valorFormatado}
            podeEditarProdutosNaVenda={exibirBotaoEditarProdutos}
            exibirBotaoSalvarCobranca={exibirBotaoSalvarCobranca}
            onEditarProdutos={onEditarProdutos}
            onConfirmarCobranca={onConfirmarCobranca}
            formaCobrancaKanban={formaCobrancaKanban}
            formaPagamentoKanban={formaPagamentoKanban}
            observacaoPedidoTexto={observacaoPedidoTexto}
            previsaoEntregaKanban={previsaoEntregaKanban}
            tipoVendaExibicao={tipoVendaView.tipoVendaExibicao}
            exibirColunaTipoVenda={tipoVendaView.exibirColunaTipoVenda}
            exibirAcaoAlterarTipoPedido={exibirAcaoAlterarTipoPedido}
            onAbrirAlterarTipoPedido={() => cardState.setEnderecoEntregaOpen(true)}
          />
        </div>

        <div className="space-y-0.5">
          {linhaTempo ? (
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-gray-500">
                {linhaTempo.prefixo} {formatarDataCard(linhaTempo.iso)}
              </span>
            </div>
          ) : null}
          {venda.dataFinalizacao && (
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-gray-500">
                Finalizada: {formatarDataCard(venda.dataFinalizacao)}
              </span>
            </div>
          )}
        </div>

        <KanbanVendaCardActions
          venda={venda}
          column={column}
          modoKanbanVendas={modoKanbanVendas}
          acaoFiscalEmAndamentoPorVenda={acaoFiscalEmAndamentoPorVenda}
          avancandoEtapaIds={avancandoEtapaIds}
          exibirAtribuirEntregador={exibirAtribuirEntregador}
          entregadorJaVinculado={entregadorJaVinculado}
          exibirQuickViewEntrega={exibirQuickViewEntrega}
          exibirBotaoObservacaoPedido={exibirBotaoObservacaoPedido}
          exibirBotaoAlterarEndereco={exibirBotaoAlterarEndereco}
          onAvancarEtapa={onAvancarEtapa}
          onReimprimirCupomDelivery={onReimprimirCupomDelivery}
          onEmitirNfe={onEmitirNfe}
          onAbrirEntregador={() => cardState.setAtribuirEntregadorOpen(true)}
          onAbrirObservacao={() => cardState.setObservacaoPedidoOpen(true)}
          onAbrirEndereco={() => cardState.setEnderecoEntregaOpen(true)}
          onAbrirQuickView={anchor => cardState.setEntregaQuickViewAnchor(anchor)}
          onAbrirDocumentoVenda={cardState.abrirDocumentoVendaKanban}
        />
      </div>

      {exibirAtribuirEntregador && (
        <AtribuirEntregadorKanbanPainel
          key={
            cardState.atribuirEntregadorOpen
              ? `atribuir-entregador-${venda.id}`
              : 'atribuir-entregador-fechado'
          }
          open={cardState.atribuirEntregadorOpen}
          venda={venda}
          entregadorVinculadoId={entregadorVinculadoId}
          onClose={() => cardState.setAtribuirEntregadorOpen(false)}
          onSalvo={(vendaId, entregadorId) => {
            onEntregadorAtualizado?.(vendaId, entregadorId)
          }}
        />
      )}

      <ObservacaoPedidoKanbanPainel
        open={cardState.observacaoPedidoOpen}
        venda={venda}
        observacaoPedidoHint={observacaoPedidoTexto || null}
        onClose={() => cardState.setObservacaoPedidoOpen(false)}
      />

      <EnderecoEntregaPedidoKanbanPainel
        open={cardState.enderecoEntregaOpen}
        venda={venda}
        onClose={() => cardState.setEnderecoEntregaOpen(false)}
      />

      {exibirQuickViewEntrega && (
        <PedidoEntregaQuickViewPopover
          vendaId={venda.id}
          tabelaOrigem={tabelaOrigemQuickView}
          colunaAtual={colunaAtual}
          tipoVenda={tipoVendaQuickView}
          observacaoPedidoHint={observacaoPedidoTexto || null}
          anchorEl={cardState.entregaQuickViewAnchor}
          open={Boolean(cardState.entregaQuickViewAnchor)}
          onClose={() => cardState.setEntregaQuickViewAnchor(null)}
        />
      )}
    </DraggableVendaCard>
  )
}
