'use client'

import { useState } from 'react'
import Tooltip from '@mui/material/Tooltip'
import {
  MdArrowForward,
  MdDeliveryDining,
  MdEdit,
  MdEditNote,
  MdPrint,
  MdVisibility,
} from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { abrirDocumentoFiscalPdf } from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { StatusFiscalBadge } from '../StatusFiscalBadge'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import { DraggableVendaCard } from './DraggableVendaCard'
import { KanbanCardAcaoButton } from './KanbanCardAcaoButton'
import { PedidoEntregaQuickViewPopover } from './PedidoEntregaQuickViewPopover'
import { AtribuirEntregadorKanbanPainel } from './AtribuirEntregadorKanbanPainel'
import { ObservacaoPedidoKanbanPainel } from './ObservacaoPedidoKanbanPainel'
import type { ColunaKanbanId, KanbanColumn, Venda } from './types'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  LABEL_SEM_CLIENTE,
  deveExibirBotaoEmitirNotaNoKanban,
  formatarDataCard,
  getCardBorderEFundoKanban,
  getLinhaTempoPedidoEntregaKanban,
  statusFiscalAguardandoSefaz,
  vendaBloqueadaParaEmissaoInterativa,
  vendaSemNomeCliente,
} from './fiscalFlowKanban.rules'

const KANBAN_BUTTON_COLOR = '#530CA3'
const TOOLTIP_VER_DETALHES_PEDIDO = 'Clique para ver os detalhes do pedido'

interface FiscalKanbanVendaCardProps {
  venda: Venda
  column: KanbanColumn
  modoKanbanVendas: ModoKanbanVendas
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  avancandoEtapaIds: Record<string, boolean>
  timestampsEtapaEntregaLocal: Record<string, string>
  onViewDetails: (venda: Venda) => void
  onAbrirEdicaoCliente: (clienteId: string) => void
  onAvancarEtapa: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  onEmitirNfe: (venda: Venda) => void
  /** Modo delivery: reimprime cupom (mesmo layout da automática). */
  onReimprimirCupomDelivery?: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  entregadorVinculadoId?: string | null
  onEntregadorAtualizado?: (vendaId: string, entregadorId: string) => void
}

export function FiscalKanbanVendaCard(props: FiscalKanbanVendaCardProps) {
  const {
    venda,
    column,
    modoKanbanVendas,
    acaoFiscalEmAndamentoPorVenda,
    avancandoEtapaIds,
    timestampsEtapaEntregaLocal,
    onViewDetails,
    onAbrirEdicaoCliente,
    onAvancarEtapa,
    onEmitirNfe,
    onReimprimirCupomDelivery,
    entregadorVinculadoId = null,
    onEntregadorAtualizado,
  } = props
  const [entregaQuickViewAnchor, setEntregaQuickViewAnchor] = useState<HTMLElement | null>(null)
  const [atribuirEntregadorOpen, setAtribuirEntregadorOpen] = useState(false)
  const [observacaoPedidoOpen, setObservacaoPedidoOpen] = useState(false)
  const valorFormatado = transformarParaReal(venda.valorFinal)
  const clienteNome = venda.cliente?.nome?.trim() ? venda.cliente.nome : LABEL_SEM_CLIENTE

  const colunaPermiteEditarCliente =
    column.id === 'FINALIZADAS' ||
    column.id === 'PENDENTE_EMISSAO' ||
    (column.id === 'COM_NFE' &&
      (acaoFiscalEmAndamentoPorVenda[venda.id] === 'reemitindo' ||
        acaoFiscalEmAndamentoPorVenda[venda.id] === 'emitindo')) ||
    (modoKanbanVendas === 'delivery' &&
      venda.isPedidoEntregaGestor() &&
      COLUNAS_ENTREGA_OPERACIONAIS.includes(column.id as ColunaKanbanId))

  const podeEditarClienteNaVenda =
    colunaPermiteEditarCliente &&
    !vendaSemNomeCliente(venda) &&
    Boolean(venda.cliente?.id?.trim())

  const tipoVendaStr = String(venda.tipoVenda ?? '').trim().toLowerCase()
  const isDeliveryOuRetirada = tipoVendaStr === 'entrega' || tipoVendaStr === 'retirada'
  const isPedidoBalcaoGestor = venda.tabelaOrigem === 'venda_gestor' && !isDeliveryOuRetirada

  const tipoVendaExibicao =
    venda.tabelaOrigem === 'venda_gestor'
      ? isDeliveryOuRetirada
        ? tipoVendaStr
        : 'gestor'
      : venda.tipoVenda
  
  const prefixoLinhaOrigemCard =
    venda.tabelaOrigem === 'venda_gestor' && isDeliveryOuRetirada
      ? (tipoVendaStr === 'retirada' ? 'Retirada' : 'Entrega')
      : isPedidoBalcaoGestor
        ? 'Balcão'
        : venda.origem

  const etapaKanbanCard =
    acaoFiscalEmAndamentoPorVenda[venda.id] === 'reemitindo' ||
    acaoFiscalEmAndamentoPorVenda[venda.id] === 'emitindo'
      ? 'COM_NFE'
      : venda.getEtapaKanban()

  /** No modo Delivery, pendente emissão aparece na coluna Finalizadas — borda/cores da etapa real. */
  const colunaIdParaEstiloCard: ColunaKanbanId =
    modoKanbanVendas === 'delivery' &&
    column.id === 'FINALIZADAS' &&
    etapaKanbanCard === 'PENDENTE_EMISSAO'
      ? 'PENDENTE_EMISSAO'
      : (column.id as ColunaKanbanId)

  const { borderClass: cardBorderClass, cardBgClass } = getCardBorderEFundoKanban(
    colunaIdParaEstiloCard,
    venda,
    acaoFiscalEmAndamentoPorVenda
  )

  const exibirQuickViewEntrega = venda.isPedidoEntregaGestor()
  const tabelaOrigemQuickView =
    venda.tabelaOrigem === 'venda_gestor' ? 'venda_gestor' : 'venda'
  const colunaAtual = column.id as ColunaKanbanId
  const tipoVendaQuickView =
    (venda.tipoVenda ?? '').trim().toLowerCase() === 'retirada' ? 'retirada' : 'entrega'
  const exibirAtribuirEntregador =
    modoKanbanVendas === 'delivery' &&
    tipoVendaStr === 'entrega' &&
    venda.isPedidoEntregaGestor() &&
    COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaAtual)
  const entregadorJaVinculado = Boolean(entregadorVinculadoId?.trim())
  const quickViewAberto = Boolean(entregaQuickViewAnchor)
  const bloquearDragCard = quickViewAberto || atribuirEntregadorOpen || observacaoPedidoOpen

  const botaoObservacaoPedido = (
    <Tooltip title="Adicionar observação ao pedido">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setObservacaoPedidoOpen(true)
        }}
        onDoubleClick={e => e.stopPropagation()}
        className="flex shrink-0 items-center gap-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-gray-600 transition-colors hover:border-primary hover:text-primary"
        aria-label="Adicionar observação ao pedido"
      >
        <MdEditNote className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] font-medium leading-none">Observação</span>
      </button>
    </Tooltip>
  )

  return (
    <DraggableVendaCard venda={venda} column={column} dragDisabled={bloquearDragCard}>
      <div
        className={`relative rounded-lg border-l-4 ${cardBorderClass} ${cardBgClass} cursor-pointer border border-gray-200/80 p-3 transition-all hover:shadow-md`}
        onClick={() => onViewDetails(venda)}
        onDoubleClick={() => onViewDetails(venda)}
      >
        <Tooltip title={TOOLTIP_VER_DETALHES_PEDIDO}>
          <div className={`mb-2 flex gap-2 ${podeEditarClienteNaVenda ? 'pr-1' : ''}`}>
          <div className="min-w-0 flex-1 border-b border-gray-100 pb-1.5">
            <p className="mb-0.5 text-xs text-gray-500">
              {prefixoLinhaOrigemCard} | Venda {venda.numeroVenda}
              {venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}
            </p>
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate text-sm font-semibold uppercase text-primary-text">
                {clienteNome}
              </span>
              {podeEditarClienteNaVenda && venda.cliente?.id && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onAbrirEdicaoCliente(venda.cliente!.id)
                  }}
                  onDoubleClick={e => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-primary transition-colors hover:bg-primary/10"
                  title="Editar dados do cliente"
                  aria-label="Editar dados do cliente"
                >
                  <MdEdit className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600">
              <span className="text-sm font-semibold text-gray-900">{valorFormatado}</span>
            </p>
            {venda.statusFiscal && (
              <>
                <div className="mt-1 flex items-center">
                  <StatusFiscalBadge status={venda.statusFiscal} tone="neutral" />
                </div>
                {venda.numeroFiscal && venda.statusFiscal === 'EMITIDA' && (
                  <div className="mt-0.5">
                    <span className="text-xs font-semibold text-gray-900">
                      {venda.tipoDocFiscal || 'NFe'} Nº {venda.numeroFiscal}
                      {venda.serieFiscal && ` / Série ${venda.serieFiscal}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {tipoVendaExibicao &&
            (tipoVendaExibicao === 'balcao' ||
              tipoVendaExibicao === 'mesa' ||
              tipoVendaExibicao === 'gestor' ||
              tipoVendaExibicao === 'entrega' ||
              tipoVendaExibicao === 'retirada') && (
              <div className="flex flex-shrink-0 items-center justify-center">
                <TipoVendaIcon
                  tipoVenda={tipoVendaExibicao as 'balcao' | 'mesa' | 'gestor' | 'entrega' | 'retirada'}
                  numeroMesa="M"
                  size={56}
                  containerScale={0.9}
                  corPrincipal="var(--color-primary)"
                  corTexto="var(--color-info)"
                  corBalcao="var(--color-primary)"
                  corGestor="var(--color-primary)"
                  corEntrega="var(--color-primary)"
                  corBorda="var(--color-primary)"
                />
              </div>
            )}
        </div>
        </Tooltip>

        <div className="space-y-0.5">
          {(() => {
            const linhaTempo = getLinhaTempoPedidoEntregaKanban(
              column.id as ColunaKanbanId,
              venda,
              timestampsEtapaEntregaLocal[venda.id]
            )
            if (!linhaTempo) return null
            return (
              <div className="flex items-center justify-between gap-1">
                <Tooltip title={TOOLTIP_VER_DETALHES_PEDIDO}>
                  <span className="text-xs text-gray-500">
                    {linhaTempo.prefixo} {formatarDataCard(linhaTempo.iso)}
                  </span>
                </Tooltip>
                {!venda.dataFinalizacao ? botaoObservacaoPedido : null}
              </div>
            )
          })()}
          {venda.dataFinalizacao && (
            <div className="flex items-center justify-between gap-1">
              <Tooltip title={TOOLTIP_VER_DETALHES_PEDIDO}>
                <span className="text-xs text-gray-500">
                  Finalizada: {formatarDataCard(venda.dataFinalizacao)}
                </span>
              </Tooltip>
              {botaoObservacaoPedido}
            </div>
          )}
        </div>

        <div
          className="mt-0.5 flex gap-2"
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          {venda.isPedidoEntregaGestor() &&
            COLUNAS_ENTREGA_OPERACIONAIS.includes(column.id as ColunaKanbanId) &&
            column.id !== 'COM_ENTREGADOR' && (
              <KanbanCardAcaoButton
                startIcon={
                  !avancandoEtapaIds[venda.id] ? <MdArrowForward size={14} /> : undefined
                }
                onClick={() => onAvancarEtapa(venda, column.id as ColunaKanbanId)}
                disabled={!!avancandoEtapaIds[venda.id]}
              >
                {avancandoEtapaIds[venda.id] ? 'Avançando...' : 'Avançar etapa'}
              </KanbanCardAcaoButton>
            )}

          {modoKanbanVendas === 'delivery' &&
            onReimprimirCupomDelivery &&
            venda.isPedidoEntregaGestor() &&
            COLUNAS_ENTREGA_OPERACIONAIS.includes(column.id as ColunaKanbanId) && (
              <Button
                size="sm"
                variant="outlined"
                className="!min-w-0 !border-gray-300 !px-2 !text-gray-700 hover:!bg-gray-50"
                sx={{ py: 0.375, minHeight: 'auto' }}
                onClick={() =>
                  onReimprimirCupomDelivery(venda, column.id as ColunaKanbanId)
                }
                title="Reimprimir"
                aria-label="Reimprimir"
              >
                <MdPrint size={16} />
              </Button>
            )}

          {exibirAtribuirEntregador && (
            <Button
              size="sm"
              variant="outlined"
              className={`!min-w-0 !px-2 hover:!bg-gray-50 ${
                entregadorJaVinculado
                  ? '!border-secondary !text-secondary'
                  : '!border-gray-300 !text-gray-700'
              }`}
              sx={{ py: 0.375, minHeight: 'auto' }}
              title={
                entregadorJaVinculado
                  ? 'Alterar entregador'
                  : 'Vincular entregador'
              }
              aria-label={
                entregadorJaVinculado
                  ? 'Alterar entregador'
                  : 'Vincular entregador'
              }
              onClick={e => {
                e.stopPropagation()
                setAtribuirEntregadorOpen(true)
              }}
            >
              <MdDeliveryDining size={16} />
            </Button>
          )}

          {exibirQuickViewEntrega && (
            <Button
              size="sm"
              variant="outlined"
              className="!min-w-0 !border-gray-300 !px-2 !text-gray-700 hover:!bg-gray-50"
              sx={{ py: 0.375, minHeight: 'auto' }}
              title="Ver dados da entrega"
              aria-label="Ver dados da entrega"
              onClick={e => {
                e.stopPropagation()
                setEntregaQuickViewAnchor(e.currentTarget)
              }}
            >
              <MdVisibility size={16} />
            </Button>
          )}

          {deveExibirBotaoEmitirNotaNoKanban(
            column.id as ColunaKanbanId,
            venda,
            acaoFiscalEmAndamentoPorVenda
          ) && (
            <KanbanCardAcaoButton
              onClick={() => onEmitirNfe(venda)}
              disabled={vendaBloqueadaParaEmissaoInterativa(
                venda,
                acaoFiscalEmAndamentoPorVenda
              )}
            >
              {(() => {
                const acaoEmAndamento = acaoFiscalEmAndamentoPorVenda[venda.id]
                if (acaoEmAndamento === 'reemitindo') return 'Reemitindo...'
                if (acaoEmAndamento === 'emitindo') return 'Emitindo...'
                const documentoLabel = venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'
                if (venda.statusFiscal === 'REJEITADA') {
                  if (venda.tipoDocFiscal === 'NFE' || venda.tipoDocFiscal === 'NFCE') {
                    return `Reemitir ${documentoLabel}`
                  }
                  return 'Reemitir nota'
                }
                if (venda.statusFiscal === 'PENDENTE_EMISSAO') return 'Aguardando...'
                if (statusFiscalAguardandoSefaz(venda)) return 'Aguardando...'
                return `Emitir Nota`
              })()}
            </KanbanCardAcaoButton>
          )}

          {column.id === 'COM_NFE' &&
            venda.documentoFiscalId &&
            (venda.statusFiscal === 'EMITIDA' || venda.statusFiscal === 'CANCELADA') && (
              <Button
                size="sm"
                variant="outlined"
                title={
                  venda.statusFiscal === 'CANCELADA'
                    ? 'Abrir PDF da nota (cancelada na SEFAZ)'
                    : undefined
                }
                className="flex-1"
                sx={{
                  py: 0.375,
                  px: 1,
                  minHeight: 'auto',
                  borderColor: KANBAN_BUTTON_COLOR,
                  color: KANBAN_BUTTON_COLOR,
                  '&:hover': {
                    borderColor: KANBAN_BUTTON_COLOR,
                    backgroundColor: 'rgba(83, 12, 163, 0.06)',
                  },
                }}
                onClick={() => {
                  void abrirDocumentoFiscalPdf(venda.documentoFiscalId!, venda.tipoDocFiscal)
                }}
              >
                Ver {venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'}
              </Button>
            )}
        </div>
      </div>

      {exibirAtribuirEntregador && (
        <AtribuirEntregadorKanbanPainel
          open={atribuirEntregadorOpen}
          venda={venda}
          entregadorVinculadoId={entregadorVinculadoId}
          onClose={() => setAtribuirEntregadorOpen(false)}
          onSalvo={(vendaId, entregadorId) => {
            onEntregadorAtualizado?.(vendaId, entregadorId)
          }}
        />
      )}

      <ObservacaoPedidoKanbanPainel
        open={observacaoPedidoOpen}
        venda={venda}
        onClose={() => setObservacaoPedidoOpen(false)}
      />

      {exibirQuickViewEntrega && (
        <PedidoEntregaQuickViewPopover
          vendaId={venda.id}
          tabelaOrigem={tabelaOrigemQuickView}
          colunaAtual={colunaAtual}
          tipoVenda={tipoVendaQuickView}
          anchorEl={entregaQuickViewAnchor}
          open={Boolean(entregaQuickViewAnchor)}
          onClose={() => setEntregaQuickViewAnchor(null)}
        />
      )}
    </DraggableVendaCard>
  )
}
