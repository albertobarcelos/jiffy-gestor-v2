/**
 * Etapa operacional canônica do pedido delivery (contrato `statusDelivery`).
 * Não confundir com coluna do Kanban.
 */
export const ETAPAS_OPERACIONAIS_DELIVERY = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
  'FINALIZADO',
  'CANCELADO',
] as const

export type EtapaOperacionalDeliveryValor = (typeof ETAPAS_OPERACIONAIS_DELIVERY)[number]

export const ETAPAS_OPERACIONAIS_DELIVERY_SET = new Set<string>(ETAPAS_OPERACIONAIS_DELIVERY)

export const ETAPAS_OPERACIONAIS_EM_CURSO = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
] as const satisfies readonly EtapaOperacionalDeliveryValor[]

export const ETAPAS_OPERACIONAIS_EDICAO_ITENS = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
] as const satisfies readonly EtapaOperacionalDeliveryValor[]
