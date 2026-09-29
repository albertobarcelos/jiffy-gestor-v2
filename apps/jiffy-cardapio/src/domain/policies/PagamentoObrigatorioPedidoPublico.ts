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
 * Gate de finalização: lista vazia ou soma abaixo do total.
 * Soma acima do total é cédula (troco); o backend exige cobranças >= valor da venda.
 * Overpay de PIX/cartão é barrado no passo de pagamento, não aqui.
 */
export function validarPagamentosPedidoPublico(
  pagamentos: LancamentoPagamentoPedidoPublico[],
  total: number
): ResultadoValidacaoPagamentosPedidoPublico {
  if (pagamentos.length === 0) {
    return { ok: false, error: MSG_PAGAMENTO_OBRIGATORIO_PEDIDO_PUBLICO }
  }
  const soma = somaLancamentos(pagamentos)
  const trocoImplicito = soma > total ? soma - total : 0
  if (!pagamentosCobremTotalPedido(total, soma, trocoImplicito)) {
    return { ok: false, error: MSG_PAGAMENTO_INCOMPLETO_PEDIDO_PUBLICO }
  }
  return { ok: true }
}
