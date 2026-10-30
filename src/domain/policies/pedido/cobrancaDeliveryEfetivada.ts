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
 * Efetivado = quitado no caixa ou já pago na loja (`antecipado`).
 * Lançar `na_entrega` para o entregador receber não é pago, mesmo com
 * objeto de pagamento efetivado. `antecipado` ainda `pendente` na API
 * já foi recebido no Gestor — a porta só cobra o restante.
 */
export function cobrancaDeliveryEstaEfetivada(s: SituacaoCobrancaDelivery): boolean {
  if (cobrancaDeliveryEstaCancelada(s)) return false
  const status = statusDe(s)
  if (status === 'paga') return true
  if (momentoDe(s) === 'na_entrega') return false
  if (momentoDe(s) === 'antecipado') return true
  if (status === 'pendente') return false
  return Boolean(s.temPagamentoEfetivado)
}

export function cobrancaDeliveryCobraNaEntrega(s: SituacaoCobrancaDelivery): boolean {
  if (cobrancaDeliveryEstaCancelada(s) || cobrancaDeliveryEstaEfetivada(s)) return false
  return momentoDe(s) === 'na_entrega'
}

/** Antecipada que o backend ainda não marcou `paga` — precisa de confirm. */
export function cobrancaDeliveryAntecipadaPendenteConfirmacao(
  s: SituacaoCobrancaDelivery
): boolean {
  if (cobrancaDeliveryEstaCancelada(s)) return false
  if (momentoDe(s) !== 'antecipado') return false
  return statusDe(s) !== 'paga'
}
