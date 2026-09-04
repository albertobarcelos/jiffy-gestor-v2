import {
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import type { OrigemVenda, TabelaOrigemVenda } from '@/src/domain/types/vendaDetalhe'

export function resolverStatusFiscalExibicao(
  statusFiscalUnificado: string | null | undefined,
  statusFiscalDetalhe: string | null | undefined,
  resumoFiscalStatus: string | null | undefined
): string | null {
  return (
    (statusFiscalUnificado && String(statusFiscalUnificado).trim()) ||
    (statusFiscalDetalhe && String(statusFiscalDetalhe).trim()) ||
    (resumoFiscalStatus && String(resumoFiscalStatus).trim()) ||
    null
  )
}

export function podeExibirAbaNotaFiscalDetalhe(params: {
  modoVisualizacao: boolean | undefined
  tabelaOrigemVenda: TabelaOrigemVenda
  statusFiscal: string | null
  origem: OrigemVenda | null
}): boolean {
  const { modoVisualizacao, tabelaOrigemVenda, statusFiscal, origem } = params
  if (!modoVisualizacao) return false
  if (!statusFiscalPermiteAbaNotaFiscal(statusFiscal)) return false

  if (tabelaOrigemVenda === 'venda') {
    return true
  }

  if (origem === 'GESTOR') return true

  return statusFiscalPermiteAbaNotaFiscal(statusFiscal)
}

export function podeExibirAbaDadosEntregaDetalhe(params: {
  modoVisualizacao: boolean | undefined
  tipoVenda: string | null | undefined
}): boolean {
  if (!params.modoVisualizacao) return false
  const tipo = String(params.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  return tipo === 'entrega'
}

export function podeExibirCancelarNotaFiscalDetalhe(params: {
  vendaId: string | undefined
  currentStep: number
  statusFiscal: string | null
  resumoFiscalStatus: string | null | undefined
}): boolean {
  const { vendaId, currentStep, statusFiscal, resumoFiscalStatus } = params
  if (!vendaId || currentStep !== 4) return false
  return statusFiscalPermiteCancelarNota(resumoFiscalStatus, statusFiscal, null)
}

/** Status operacionais terminais — pedido não pode mais ser cancelado. */
const STATUS_ETAPA_PEDIDO_DELIVERY_ENCERRADO = new Set([
  'FINALIZADO',
  'FINALIZADA',
  'CANCELADO',
  'CANCELADA',
])

/** Pedido delivery pode ser cancelado em qualquer etapa operacional, exceto finalizado ou já cancelado. */
export function statusEtapaPermiteCancelarPedidoDelivery(
  statusEtapaOperacional: string | null | undefined
): boolean {
  const status = String(statusEtapaOperacional ?? '').trim().toUpperCase()
  if (!status) return true
  return !STATUS_ETAPA_PEDIDO_DELIVERY_ENCERRADO.has(status)
}

export function podeExibirCancelarPedidoDeliveryOperacional(params: {
  modoVisualizacao: boolean | undefined
  tabelaOrigemVenda: TabelaOrigemVenda
  tipoVenda: string | null | undefined
  vendaId: string | undefined
  currentStep: number
  vendaGestorJaCancelada: boolean
  dataFinalizacaoCarregada: string | null
  statusEtapaOperacional: string | null | undefined
}): boolean {
  if (!params.modoVisualizacao) return false
  if (params.tabelaOrigemVenda !== 'venda_gestor') return false
  if (!params.vendaId || params.currentStep !== 4) return false
  if (params.vendaGestorJaCancelada) return false
  if (params.dataFinalizacaoCarregada) return false

  const tipo = String(params.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  if (tipo !== 'entrega' && tipo !== 'retirada') return false

  return statusEtapaPermiteCancelarPedidoDelivery(params.statusEtapaOperacional)
}
