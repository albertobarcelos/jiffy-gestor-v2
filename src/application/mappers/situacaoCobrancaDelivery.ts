import {
  cobrancaDeliveryAntecipadaPendenteConfirmacao,
  cobrancaDeliveryCobraNaEntrega,
  cobrancaDeliveryEstaCancelada,
  cobrancaDeliveryEstaEfetivada,
  type SituacaoCobrancaDelivery,
} from '@/src/domain/policies/pedido/cobrancaDeliveryEfetivada'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Lê o recorte da cobrança na API para a política de domínio. */
export function situacaoCobrancaDeliveryDeRaw(raw: unknown): SituacaoCobrancaDelivery {
  const c = asRecord(raw)
  if (!c) return {}
  return {
    status: c.status != null ? String(c.status) : null,
    momentoCobranca: String(c.momentoCobranca ?? c.momento_cobranca ?? ''),
    dataCancelamento: c.dataCancelamento != null ? String(c.dataCancelamento) : null,
    temPagamentoEfetivado: asRecord(c.pagamentoEfetivado) != null,
  }
}

export function cobrancaRawEstaCancelada(raw: unknown): boolean {
  return cobrancaDeliveryEstaCancelada(situacaoCobrancaDeliveryDeRaw(raw))
}

export function cobrancaRawEstaEfetivada(raw: unknown): boolean {
  return cobrancaDeliveryEstaEfetivada(situacaoCobrancaDeliveryDeRaw(raw))
}

export function cobrancaRawCobraNaEntrega(raw: unknown): boolean {
  return cobrancaDeliveryCobraNaEntrega(situacaoCobrancaDeliveryDeRaw(raw))
}

export function cobrancaRawAntecipadaPendenteConfirmacao(raw: unknown): boolean {
  return cobrancaDeliveryAntecipadaPendenteConfirmacao(situacaoCobrancaDeliveryDeRaw(raw))
}
