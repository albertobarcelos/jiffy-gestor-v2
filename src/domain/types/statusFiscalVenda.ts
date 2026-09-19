/**
 * Status fiscal canônico da venda no Gestor (listagem unificada / resumo).
 * Não misturar com etapa operacional. `NFeStatus` da entidade é este vocabulário.
 */
export const STATUS_FISCAIS_VENDA = [
  'PENDENTE',
  'PENDENTE_EMISSAO',
  'EMITINDO',
  'PENDENTE_AUTORIZACAO',
  'CONTINGENCIA',
  'EMITIDA',
  'REJEITADA',
  'DENEGADA',
  'CANCELADA',
  'INUTILIZADA',
  'UNKNOWN',
] as const

export type StatusFiscalVendaValor = (typeof STATUS_FISCAIS_VENDA)[number]

export const STATUS_FISCAIS_VENDA_SET = new Set<string>(STATUS_FISCAIS_VENDA)

export type BucketStatusEntreguesFiscal = 'EMITIDA' | 'CANCELADA' | 'REJEITADA' | 'PENDENTE'
