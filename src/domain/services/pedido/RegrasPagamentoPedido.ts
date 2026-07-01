import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import { totalPagamentosEfetivos } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'

const TOLERANCIA_TOTAL_PEDIDO = 0.01

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

/** Cobrança ativa ainda não efetivada (ex.: “cobrar na entrega”). */
export function pagamentoPendenteNaEntrega(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false
  return p.cobrarNaEntrega === true || p.naoEfetivo === true
}

export function pedidoTemCobrancaPendenteNaEntrega(pagamentos: PagamentoSelecionado[]): boolean {
  return pagamentos.some(pagamentoPendenteNaEntrega)
}

/** Pagamento quitado e efetivado — oculta ajuste/remover/salvar, mas não bloqueia novo lançamento após remover. */
export function pagamentoEntregaConfirmadoNoPedido(
  pagamentos: PagamentoSelecionado[],
  totalPedido: number
): boolean {
  const ativos = pagamentos.filter(p => !pagamentoEstaCancelado(p))
  if (ativos.length === 0) return false
  if (pedidoTemCobrancaPendenteNaEntrega(pagamentos)) return false
  const efetivo = totalPagamentosEfetivos(pagamentos)
  return efetivo >= totalPedido - TOLERANCIA_TOTAL_PEDIDO
}

/**
 * Lista exibida no passo 4: mostra apenas pagamentos ativos/efetivados.
 * Oculta cancelados (o backend cancela o pagamento anterior ao trocar a forma de pagamento,
 * gerando um "cancelado" que nunca foi efetivado) e TEF não confirmado em pagamento ativo.
 */
export function pagamentoDeveAparecerNosDetalhesPedido(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false
  const usaTef = p.isTefUsed === true
  if (usaTef && p.isTefConfirmed !== true) return false
  return true
}

/** Destaque vermelho: somente pagamentos cancelados (TEF pendente ativo não é renderizado na lista). */
export function pagamentoComDestaqueCanceladoDetalhes(p: PagamentoSelecionado): boolean {
  return pagamentoEstaCancelado(p)
}
