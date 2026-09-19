/**
 * Status fiscal do documento — enum do Swagger (`resumoFiscal.status` / documento fiscal).
 * `PENDENTE_EMISSAO` é coluna do Kanban (`solicitarEmissaoFiscal`), não status.
 */
export const STATUS_FISCAIS_VENDA = [
  'PENDENTE',
  'EMITINDO',
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
