/**
 * Pedido público exige ao menos uma cobrança que cubra o total.
 * Sem cobrança o backend/Gestor tratam como "já foi pago" — invariante de domínio.
 */

import { pagamentosCobremTotalPedido } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'

export const MSG_PAGAMENTO_OBRIGATORIO_PEDIDO_PUBLICO =
  'Escolha a forma de pagamento para finalizar o pedido'

export const MSG_PAGAMENTO_INCOMPLETO_PEDIDO_PUBLICO =
  'Complete o pagamento para finalizar o pedido'

export type LancamentoPagamentoPedidoPublico = {
  meioPagamentoId: string
  valor: number
}

export type ResultadoValidacaoPagamentosPedidoPublico =
  | { ok: true }
  | { ok: false; error: string }

function somaLancamentos(pagamentos: LancamentoPagamentoPedidoPublico[]): number {
  return pagamentos.reduce((acc, p) => acc + p.valor, 0)
}

/**
 * Gate de finalização: lista vazia ou soma que não cobre o total.
 * Troco de dinheiro é validado no passo de pagamento; aqui exige cobertura sem overpay “cego”.
 */
export function validarPagamentosPedidoPublico(
  pagamentos: LancamentoPagamentoPedidoPublico[],
  total: number
): ResultadoValidacaoPagamentosPedidoPublico {
  if (pagamentos.length === 0) {
    return { ok: false, error: MSG_PAGAMENTO_OBRIGATORIO_PEDIDO_PUBLICO }
  }
  const soma = somaLancamentos(pagamentos)
  if (!pagamentosCobremTotalPedido(total, soma, 0)) {
    return { ok: false, error: MSG_PAGAMENTO_INCOMPLETO_PEDIDO_PUBLICO }
  }
  return { ok: true }
}
