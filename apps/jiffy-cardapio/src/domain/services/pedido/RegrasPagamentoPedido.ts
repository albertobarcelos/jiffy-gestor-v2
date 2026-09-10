import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

/** Cancelado pela flag ou por dataCancelamento preenchida. */
export function pagamentoEstaCancelado(p: PagamentoSelecionado): boolean {
  return (
    p.cancelado === true ||
    (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
  )
}

/**
 * Pagamentos que entram no total pago e no troco do checkout público.
 * Exclui cancelados; se usa TEF, exige isTefConfirmed === true.
 */
export function pagamentoContaComoEfetivo(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false
  if (p.cobrarNaEntrega === true || p.naoEfetivo === true) return false

  const usaTef = p.isTefUsed === true
  if (usaTef) {
    const tefConfirmado = p.isTefConfirmed === true
    if (!tefConfirmado) return false
  }
  return true
}
