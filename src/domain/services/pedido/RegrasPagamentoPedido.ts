import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

/**
 * Mesma regra de DetalhesVendas: cancelado pela flag ou por dataCancelamento preenchida.
 */
export function pagamentoEstaCancelado(p: PagamentoSelecionado): boolean {
  return (
    p.cancelado === true ||
    (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
  )
}

/**
 * Pagamentos que entram no total pago e no troco (equivale a `trocoCalculado` / pagamentos válidos em DetalhesVendas).
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

/**
 * Lista exibida no passo 4: oculta TEF não confirmado apenas em pagamento ainda ativo (cancelados seguem visíveis).
 * Igual ao `.filter` de Pagamentos Realizados em DetalhesVendas.
 */
export function pagamentoDeveAparecerNosDetalhesPedido(p: PagamentoSelecionado): boolean {
  const isCancelado = pagamentoEstaCancelado(p)
  const usaTef = p.isTefUsed === true
  if (usaTef && !isCancelado) {
    if (p.isTefConfirmed !== true) return false
  }
  return true
}

/** Destaque vermelho: somente pagamentos cancelados (TEF pendente ativo não é renderizado na lista). */
export function pagamentoComDestaqueCanceladoDetalhes(p: PagamentoSelecionado): boolean {
  return pagamentoEstaCancelado(p)
}
