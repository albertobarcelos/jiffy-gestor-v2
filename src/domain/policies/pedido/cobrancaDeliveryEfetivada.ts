/** Recorte de cobrança delivery — sem formato da API. */

export type SituacaoCobrancaDelivery = {
  status?: string | null
  momentoCobranca?: string | null
  dataCancelamento?: string | null
  temPagamentoEfetivado?: boolean
}

function statusDe(s: SituacaoCobrancaDelivery): string {
  return String(s.status ?? '').trim().toLowerCase()
}

function momentoDe(s: SituacaoCobrancaDelivery): string {
  return String(s.momentoCobranca ?? '').trim().toLowerCase()
}

export function cobrancaDeliveryEstaCancelada(s: SituacaoCobrancaDelivery): boolean {
  if (statusDe(s) === 'cancelada') return true
  return Boolean(String(s.dataCancelamento ?? '').trim())
}

/**
 * Efetivado = quitado. Lançar `na_entrega` para o entregador receber não é pago,
 * mesmo que venha objeto vazio em pagamento efetivado.
 */
export function cobrancaDeliveryEstaEfetivada(s: SituacaoCobrancaDelivery): boolean {
  const status = statusDe(s)
  if (status === 'paga') return true
  if (status === 'pendente' || status === 'cancelada') return false
  if (momentoDe(s) === 'na_entrega') return false
  return Boolean(s.temPagamentoEfetivado)
}

export function cobrancaDeliveryCobraNaEntrega(s: SituacaoCobrancaDelivery): boolean {
  if (cobrancaDeliveryEstaCancelada(s) || cobrancaDeliveryEstaEfetivada(s)) return false
  return momentoDe(s) === 'na_entrega'
}
