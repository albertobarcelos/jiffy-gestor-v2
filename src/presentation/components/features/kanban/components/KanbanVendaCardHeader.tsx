'use client'

import Tooltip from '@mui/material/Tooltip'
import { MdAccessTime, MdEdit, MdSync } from 'react-icons/md'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import { StatusFiscalBadge } from '../../fiscal/StatusFiscalBadge'
import { fiscalKanbanPodeReemitirAposCooldown } from '../rules/fiscalFlowKanban.rules'
import type { TipoVendaExibicaoCard } from '../utils/kanbanVendaCardViewModel'
import type { Venda } from '../types'

export interface KanbanVendaCardHeaderProps {
  venda: Venda
  exibirMetaDeliveryKanban: boolean
  linhaIdentificacaoVenda: string
  prefixoLinhaOrigemCard: string
  clienteNome: string
  valorFormatado: string
  podeEditarClienteNaVenda: boolean
  exibirBotaoSalvarCobranca: boolean
  onAbrirEdicaoCliente: (clienteId: string) => void
  onConfirmarCobranca?: (venda: Venda) => void
  formaCobrancaKanban: string | null
  formaPagamentoKanban: string | null
  observacaoPedidoTexto: string
  previsaoEntregaKanban: string | null
  tipoVendaExibicao: TipoVendaExibicaoCard
  exibirColunaTipoVenda: boolean
  exibirAcaoAlterarTipoPedido: boolean
  onAbrirAlterarTipoPedido: () => void
}

function TipoVendaIconCard({
  venda,
  tipoVendaExibicao,
  exibirColunaTipoVenda,
  exibirAcaoAlterarTipoPedido,
  onAbrirAlterarTipoPedido,
}: Pick<
  KanbanVendaCardHeaderProps,
  | 'venda'
  | 'tipoVendaExibicao'
  | 'exibirColunaTipoVenda'
  | 'exibirAcaoAlterarTipoPedido'
  | 'onAbrirAlterarTipoPedido'
>) {
  if (!exibirColunaTipoVenda) return null

  const icon = (
    <TipoVendaIcon
      tipoVenda={tipoVendaExibicao as 'balcao' | 'mesa' | 'gestor' | 'entrega' | 'retirada'}
      numeroMesa={tipoVendaExibicao === 'mesa' ? venda.numeroMesa : undefined}
      size={56}
      containerScale={0.9}
      corPrincipal="var(--color-primary)"
      corTexto="var(--color-info)"
      corBalcao="var(--color-primary)"
      corGestor="var(--color-primary)"
      corEntrega="var(--color-primary)"
      corBorda="var(--color-primary)"
    />
  )

  if (exibirAcaoAlterarTipoPedido) {
    return (
      <span
        role="button"
        tabIndex={0}
        title="Clique duas vezes para alterar o tipo do pedido (entrega/retirada)"
        aria-label="Alterar tipo do pedido (entrega ou retirada)"
        className="cursor-pointer select-none"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => {
          e.stopPropagation()
          onAbrirAlterarTipoPedido()
        }}
      >
        {icon}
      </span>
    )
  }

  return icon
}

function ClienteValorBlock({
  venda,
  clienteNome,
  valorFormatado,
  podeEditarClienteNaVenda,
  exibirBotaoSalvarCobranca,
  onAbrirEdicaoCliente,
  onConfirmarCobranca,
}: Pick<
  KanbanVendaCardHeaderProps,
  | 'venda'
  | 'clienteNome'
  | 'valorFormatado'
  | 'podeEditarClienteNaVenda'
  | 'exibirBotaoSalvarCobranca'
  | 'onAbrirEdicaoCliente'
  | 'onConfirmarCobranca'
>) {
  return (
    <>
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
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-900">{valorFormatado}</span>
        {exibirBotaoSalvarCobranca && onConfirmarCobranca ? (
          <Tooltip title="Modificar Pagamento">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onConfirmarCobranca(venda)
              }}
              onDoubleClick={e => e.stopPropagation()}
              className="shrink-0 rounded p-0.5 text-primary transition-colors hover:bg-primary/10"
              aria-label="Modificar pagamento"
            >
              <MdSync className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </>
  )
}

function BlocoStatusFiscal({ venda }: { venda: Venda }) {
  if (!venda.statusFiscal) return null

  return (
    <>
      <div className="mt-1 flex items-center">
        <StatusFiscalBadge
          status={
            fiscalKanbanPodeReemitirAposCooldown(venda) ? 'REJEITADA' : venda.statusFiscal
          }
          tone="neutral"
        />
      </div>
      {venda.numeroFiscal &&
        (venda.statusFiscal === 'EMITIDA' || venda.statusFiscal === 'INUTILIZADA') && (
          <div className="mt-0.5">
            <span className="text-xs font-semibold text-gray-900">
              {venda.tipoDocFiscal === 'NFCE' ? 'NFCe' : 'NFe'} Nº {venda.numeroFiscal}
              {venda.serieFiscal && ` / Série ${venda.serieFiscal}`}
            </span>
          </div>
        )}
    </>
  )
}

export function KanbanVendaCardHeader(props: KanbanVendaCardHeaderProps) {
  const {
    venda,
    exibirMetaDeliveryKanban,
    linhaIdentificacaoVenda,
    prefixoLinhaOrigemCard,
    clienteNome,
    valorFormatado,
    podeEditarClienteNaVenda,
    exibirBotaoSalvarCobranca,
    onAbrirEdicaoCliente,
    onConfirmarCobranca,
    formaCobrancaKanban,
    formaPagamentoKanban,
    observacaoPedidoTexto,
    previsaoEntregaKanban,
    tipoVendaExibicao,
    exibirColunaTipoVenda,
    exibirAcaoAlterarTipoPedido,
    onAbrirAlterarTipoPedido,
  } = props

  const tipoVendaIconEl = (
    <TipoVendaIconCard
      venda={venda}
      tipoVendaExibicao={tipoVendaExibicao}
      exibirColunaTipoVenda={exibirColunaTipoVenda}
      exibirAcaoAlterarTipoPedido={exibirAcaoAlterarTipoPedido}
      onAbrirAlterarTipoPedido={onAbrirAlterarTipoPedido}
    />
  )

  const previsaoEntregaKanbanBadge =
    exibirMetaDeliveryKanban && previsaoEntregaKanban ? (
      <div
        className="flex items-center gap-1 text-sm font-semibold tabular-nums leading-none text-gray-700"
        title="Previsão de entrega"
      >
        <MdAccessTime className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden />
        <span>{previsaoEntregaKanban}</span>
      </div>
    ) : null

  const colunaTipoVendaIcon = tipoVendaIconEl ? (
    <div className="flex flex-shrink-0 flex-col items-center justify-start">{tipoVendaIconEl}</div>
  ) : null

  if (exibirMetaDeliveryKanban) {
    return (
      <div className="flex gap-2 border-b border-gray-100 pb-1.5">
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-xs leading-tight text-gray-500">{linhaIdentificacaoVenda}</p>
          <ClienteValorBlock
            venda={venda}
            clienteNome={clienteNome}
            valorFormatado={valorFormatado}
            podeEditarClienteNaVenda={podeEditarClienteNaVenda}
            exibirBotaoSalvarCobranca={exibirBotaoSalvarCobranca}
            onAbrirEdicaoCliente={onAbrirEdicaoCliente}
            onConfirmarCobranca={onConfirmarCobranca}
          />
          {formaCobrancaKanban || formaPagamentoKanban ? (
            <div className="mt-0.5 gap-1">
              {formaPagamentoKanban ? (
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Pagamento:</span> {formaPagamentoKanban}
                </p>
              ) : null}
              {formaCobrancaKanban ? (
                <p className="text-xs font-medium text-gray-600">{formaCobrancaKanban}</p>
              ) : null}
            </div>
          ) : null}
          {observacaoPedidoTexto ? (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600" title={observacaoPedidoTexto}>
              <span className="font-medium text-gray-700">Obs:</span> {observacaoPedidoTexto}
            </p>
          ) : null}
          <BlocoStatusFiscal venda={venda} />
        </div>
        <div className="flex flex-shrink-0 flex-col items-center self-start">
          {previsaoEntregaKanbanBadge}
          {tipoVendaIconEl}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1 border-b border-gray-100 pb-1.5">
        <p className="mb-0.5 text-xs text-gray-500">
          {prefixoLinhaOrigemCard} | {linhaIdentificacaoVenda}
        </p>
        <ClienteValorBlock
          venda={venda}
          clienteNome={clienteNome}
          valorFormatado={valorFormatado}
          podeEditarClienteNaVenda={podeEditarClienteNaVenda}
          exibirBotaoSalvarCobranca={exibirBotaoSalvarCobranca}
          onAbrirEdicaoCliente={onAbrirEdicaoCliente}
          onConfirmarCobranca={onConfirmarCobranca}
        />
        {observacaoPedidoTexto ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-600" title={observacaoPedidoTexto}>
            <span className="font-medium text-gray-700">Obs:</span> {observacaoPedidoTexto}
          </p>
        ) : null}
        <BlocoStatusFiscal venda={venda} />
      </div>
      {colunaTipoVendaIcon}
    </div>
  )
}
