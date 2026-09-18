import { ehPedidoModuloDelivery } from '@/src/domain/services/pedido/PedidoModuloDelivery'

const STATUS_DELIVERY_FINALIZADO = new Set([
  'FINALIZADO',
  'FINALIZADA',
  'ENTREGUE',
  'CONCLUIDO',
])

const STATUS_DELIVERY_OPERACIONAL = new Set([
  'NOVOS_PEDIDOS',
  'NOVO',
  'RECEBIDO',
  'PENDENTE_TRIAGEM',
  'PENDENTE',
  'EM_PREPARO',
  'PREPARO',
  'COZINHA',
  'PRONTO_ENTREGA',
  'PRONTO',
  'EM_ROTA',
  'ROTA',
])

export const MENSAGEM_EMISSAO_DELIVERY_SO_FINALIZADO =
  'A nota fiscal do delivery só pode ser emitida depois que o pedido for finalizado.'

export type DecisaoEmissaoFiscalDelivery = 'liberado' | 'bloqueado' | 'indeterminado'

export type ContextoEmissaoFiscalDelivery = {
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoVenda?: string | null
  statusEtapaOperacional?: string | null
  cancelado?: boolean
}

export function statusEtapaDeliveryEstaFinalizado(
  statusEtapaOperacional?: string | null
): boolean {
  const status = String(statusEtapaOperacional ?? '')
    .trim()
    .toUpperCase()
  return STATUS_DELIVERY_FINALIZADO.has(status)
}

export function statusEtapaDeliveryAindaOperacional(
  statusEtapaOperacional?: string | null
): boolean {
  const status = String(statusEtapaOperacional ?? '')
    .trim()
    .toUpperCase()
  return STATUS_DELIVERY_OPERACIONAL.has(status)
}

/**
 * Decisão só pela etapa operacional. Sem status, devolve `indeterminado`
 * para a UI resolver com a coluna fiscal da listagem.
 */
export function avaliarEmissaoFiscalDelivery(
  input: ContextoEmissaoFiscalDelivery
): DecisaoEmissaoFiscalDelivery {
  if (!ehPedidoModuloDelivery(input.tabelaOrigem, input.tipoVenda)) {
    return 'liberado'
  }
  if (input.cancelado) return 'bloqueado'
  if (statusEtapaDeliveryEstaFinalizado(input.statusEtapaOperacional)) return 'liberado'
  if (statusEtapaDeliveryAindaOperacional(input.statusEtapaOperacional)) return 'bloqueado'
  return 'indeterminado'
}

export function pedidoDeliveryPermiteEmissaoFiscal(
  input: ContextoEmissaoFiscalDelivery
): boolean {
  return avaliarEmissaoFiscalDelivery(input) === 'liberado'
}

export function numeroOpcionalReemitirNotaDelivery(
  numero?: number | null
): number | undefined {
  if (numero == null) return undefined
  const valor = Number(numero)
  if (!Number.isFinite(valor) || valor < 1) return undefined
  return valor
}

/** Contrato homologação: `{ numero? }` — id do pedido fica na URL. */
export function montarBodyReemitirNotaDelivery(params: {
  numero?: number | null
}): Record<string, number> {
  const numero = numeroOpcionalReemitirNotaDelivery(params.numero)
  if (numero == null) return {}
  return { numero }
}
