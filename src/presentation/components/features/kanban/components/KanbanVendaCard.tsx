'use client'

import { useEffect } from 'react'
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
import { OrigemCanalMark } from '@/src/presentation/components/features/origem/OrigemCanalMark'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import {
  derivarTipoVendaCardKanban,
  exibirSeloCanalMarketplace,
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
  exibirAtribuirEntregadorKanban,
  formatarDataCard,
  getCardBorderEFundoKanban,
  getLinhaTempoPedidoEntregaKanban,
  podeEditarProdutosNaKanbanCard,
  rotuloLinhaTempoCardCompacto,
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
  onReimprimirCupomDelivery?: (
    venda: Venda,
    colunaAtual: ColunaKanbanId
  ) => void | Promise<void>
  entregadorVinculadoId?: string | null
  onEntregadorAtualizado?: (vendaId: string, entregadorId: string | null) => void
  nomesMeiosPagamento?: Record<string, string>
  /** Painel lateral (WhatsApp): não usa DnD. */
  arrastarDesabilitado?: boolean
  /** Painéis do card (entregador, observação, endereço, quick view). */
  onPainelAbertoChange?: (aberto: boolean) => void
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
    nomesMeiosPagamento = {},
    arrastarDesabilitado = false,
    onPainelAbertoChange,
  } = props

  const colunaAtual = column.id as ColunaKanbanId
  const tipoVendaView = derivarTipoVendaCardKanban(venda)
  const seloCanal = exibirSeloCanalMarketplace(venda.origem)
  const etapaKanbanCard = venda.getEtapaKanban() as ColunaKanbanId
  const colunaIdParaEstiloCard = colunaParaEstiloCardKanban(
    colunaAtual,
    etapaKanbanCard,
    modoKanbanVendas
  )
  const { borderClass: cardBorderClass, cardBgClass } = getCardBorderEFundoKanban(
    colunaIdParaEstiloCard,
    venda,
    acaoFiscalEmAndamentoPorVenda,
    modoKanbanVendas
  )

  const exibirAtribuirEntregador = exibirAtribuirEntregadorKanban(
    modoKanbanVendas,
    venda,
    colunaAtual
  )
  const entregadorJaVinculado = Boolean(entregadorVinculadoId?.trim())

  const cardState = useKanbanVendaCardState()

  useEffect(() => {
    if (!cardState.bloquearDragCard) return
    onPainelAbertoChange?.(true)
    return () => onPainelAbertoChange?.(false)
  }, [cardState.bloquearDragCard, onPainelAbertoChange])

  const valorFormatado = transformarParaReal(venda.valorFinal)
  const clienteNome = venda.cliente?.nome?.trim() ? venda.cliente.nome : LABEL_SEM_CLIENTE
  const observacaoPedidoTexto = textoFromObservacoesApi(venda.observacoes)

  const exibirQuickViewEntrega = venda.isPedidoEntregaGestor()
  const tabelaOrigemQuickView =
    venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda'
  const tipoEntregaQuickView = venda.tipoAtendimento()

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
  const exibirMetaDeliveryKanban =
    modoKanbanVendas === 'delivery' && venda.isPedidoEntregaGestor()
  const previsaoEntregaKanban = exibirMetaDeliveryKanban
    ? formatarPrevisaoEntregaKanbanCard(venda)
    : null
  const formaCobrancaKanban = exibirMetaDeliveryKanban
    ? rotuloFormaCobrancaKanbanCard(venda.tipoAtendimento(), venda.fluxoPagamentoEntrega)
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
      dragDisabled={arrastarDesabilitado || cardState.bloquearDragCard}
    >
      <div
        className={`relative rounded-lg border-l-4 ${cardBorderClass} ${cardBgClass} cursor-pointer border border-gray-200/80 ${arrastarDesabilitado ? 'p-2.5 shadow-sm' : 'p-3'} transition-all hover:shadow-md ${seloCanal ? 'pr-12' : ''}`}
        onClick={() => onViewDetails(venda)}
        onDoubleClick={() => onViewDetails(venda)}
      >
        {seloCanal ? (
          <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-1.5">
            <OrigemCanalMark
              origem={venda.origem}
              size={28}
              width={56}
              className="rounded-none rounded-tr-lg rounded-bl-md border-gray-300"
            />
            {exibirMetaDeliveryKanban && tipoVendaView.exibirColunaTipoVenda ? (
              <span
                className={
                  exibirAcaoAlterarTipoPedido ? 'cursor-pointer select-none pb-0.5' : 'pb-0.5'
                }
                role={exibirAcaoAlterarTipoPedido ? 'button' : undefined}
                tabIndex={exibirAcaoAlterarTipoPedido ? 0 : undefined}
                title={
                  exibirAcaoAlterarTipoPedido
                    ? 'Clique duas vezes para alterar o tipo do pedido (entrega/retirada)'
                    : undefined
                }
                onClick={e => e.stopPropagation()}
                onDoubleClick={e => {
                  e.stopPropagation()
                  if (exibirAcaoAlterarTipoPedido) cardState.setEnderecoEntregaOpen(true)
                }}
              >
                <TipoVendaIcon
                  tipoVenda={
                    tipoVendaView.tipoVendaExibicao as
                      | 'balcao'
                      | 'mesa'
                      | 'gestor'
                      | 'entrega'
                      | 'retirada'
                      | 'delivery'
                  }
                  numeroMesa={
                    tipoVendaView.tipoVendaExibicao === 'mesa' ? venda.numeroMesa : undefined
                  }
                  size={56}
                  containerScale={0.9}
                  corPrincipal="var(--color-primary)"
                  corTexto="var(--color-info)"
                  corBalcao="var(--color-primary)"
                  corGestor="var(--color-primary)"
                  corEntrega="var(--color-primary)"
                  corBorda="var(--color-primary)"
                />
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={`mb-2 ${exibirBotaoEditarProdutos ? 'pr-1' : ''}`}>
          <KanbanVendaCardHeader
            venda={venda}
            exibirMetaDeliveryKanban={exibirMetaDeliveryKanban}
            prefixoLinhaOrigemCard={tipoVendaView.prefixoLinhaOrigemCard}
            clienteNome={clienteNome}
            valorFormatado={valorFormatado}
            podeEditarProdutosNaVenda={exibirBotaoEditarProdutos}
            onEditarProdutos={onEditarProdutos}
            formaCobrancaKanban={formaCobrancaKanban}
            formaPagamentoKanban={formaPagamentoKanban}
            observacaoPedidoTexto={observacaoPedidoTexto}
            previsaoEntregaKanban={previsaoEntregaKanban}
            tipoVendaExibicao={tipoVendaView.tipoVendaExibicao}
            exibirColunaTipoVenda={tipoVendaView.exibirColunaTipoVenda}
            exibirAcaoAlterarTipoPedido={exibirAcaoAlterarTipoPedido}
            onAbrirAlterarTipoPedido={() => cardState.setEnderecoEntregaOpen(true)}
            ocultarIconeTipoVenda={seloCanal}
          />
        </div>

          {venda.dataFinalizacao ? (
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-gray-500">
                Finalizada: {formatarDataCard(venda.dataFinalizacao)}
              </span>
            </div>
          ) : null}

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
          linhaEtapa={linhaTempo ? rotuloLinhaTempoCardCompacto(linhaTempo) : null}
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

      {exibirQuickViewEntrega && tipoEntregaQuickView && (
        <PedidoEntregaQuickViewPopover
          vendaId={venda.id}
          tabelaOrigem={tabelaOrigemQuickView}
          colunaAtual={colunaAtual}
          tipoVenda={venda.tipoVenda}
          tipoEntrega={tipoEntregaQuickView}
          observacaoPedidoHint={observacaoPedidoTexto || null}
          anchorEl={cardState.entregaQuickViewAnchor}
          open={Boolean(cardState.entregaQuickViewAnchor)}
          onClose={() => cardState.setEntregaQuickViewAnchor(null)}
        />
      )}
    </DraggableVendaCard>
  )
}
