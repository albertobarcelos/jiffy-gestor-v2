import type { CheckoutPagamentoItem } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import {
  calcularTrocoSobreLancamentos,
  pagamentosCobremTotalPedido,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'

export type { CheckoutPagamentoItem }

const TOLERANCIA_CENTAVOS = 0.01

export function roundMoneyCheckout(value: number): number {
  return Math.round(value * 100) / 100
}

function roundMoney(value: number): number {
  return roundMoneyCheckout(value)
}

export function somaPagamentosCheckout(pagamentos: CheckoutPagamentoItem[]): number {
  return pagamentos.reduce((acc, p) => acc + p.valor, 0)
}

/**
 * Quanto ainda falta cobrir do pedido.
 * Excesso de dinheiro (cédula > restante) não gera saldo negativo — zera o restante.
 */
export function restantePagamentoCheckout(
  total: number,
  pagamentos: CheckoutPagamentoItem[]
): number {
  return Math.max(0, roundMoney(total - somaPagamentosCheckout(pagamentos)))
}

/**
 * Troco a receber a partir dos lançamentos (último dinheiro que ultrapassa o que faltava).
 * Delega ao núcleo de domínio compartilhado com o gestor.
 */
export function calcularTrocoCheckout(
  total: number,
  pagamentos: CheckoutPagamentoItem[],
  isDinheiro: (meioPagamentoId: string) => boolean
): number {
  return roundMoney(
    calcularTrocoSobreLancamentos({
      total,
      lancamentos: pagamentos.map(p => ({
        valor: p.valor,
        isDinheiro: isDinheiro(p.meioPagamentoId),
      })),
    })
  )
}

/**
 * Total coberto se soma ≈ total, ou se soma > total com troco de dinheiro.
 */
export function pagamentosCobremTotalCheckout(
  total: number,
  pagamentos: CheckoutPagamentoItem[],
  isDinheiro?: (meioPagamentoId: string) => boolean
): boolean {
  if (pagamentos.length === 0) return false
  const soma = somaPagamentosCheckout(pagamentos)
  const troco =
    isDinheiro != null ? calcularTrocoCheckout(total, pagamentos, isDinheiro) : 0
  return pagamentosCobremTotalPedido(total, soma, troco)
}

export type AdicaoPagamentoCheckout =
  | {
      ok: true
      valorLancamento: number
      trocoReceber: number
    }
  | { ok: false; error: string }

/**
 * Confirma adição de um pagamento após escolher o meio.
 *
 * Dinheiro + troco: cobrança = cédula (backend deriva o troco).
 * Dinheiro sem troco / outros meios: cobrança = valor informado (≤ restante).
 */
export function resolverAdicaoPagamentoCheckout(params: {
  restante: number
  valorPagamento: number | null
  ehDinheiro: boolean
  precisaTroco: boolean
  valorCedula: number | null
}): AdicaoPagamentoCheckout {
  const { restante, valorPagamento, ehDinheiro, precisaTroco, valorCedula } = params

  if (restante <= TOLERANCIA_CENTAVOS) {
    return { ok: false, error: 'O pagamento já está completo' }
  }

  if (ehDinheiro && precisaTroco) {
    if (valorCedula == null || valorCedula <= 0) {
      return { ok: false, error: 'Informe quanto você vai pagar em dinheiro' }
    }
    if (valorCedula - restante <= TOLERANCIA_CENTAVOS) {
      return {
        ok: false,
        error: 'Para ter troco, o valor entregue deve ser maior que o restante',
      }
    }
    const cedula = roundMoney(valorCedula)
    return {
      ok: true,
      valorLancamento: cedula,
      trocoReceber: roundMoney(cedula - restante),
    }
  }

  if (valorPagamento == null || valorPagamento <= 0) {
    return { ok: false, error: 'Informe o valor deste pagamento' }
  }

  if (valorPagamento - restante > TOLERANCIA_CENTAVOS) {
    return { ok: false, error: 'O valor não pode ser maior que o restante a pagar' }
  }

  return {
    ok: true,
    valorLancamento: roundMoney(valorPagamento),
    trocoReceber: 0,
  }
}

/** Prévia do troco: cédula − restante a cobrir em dinheiro. */
export function calcularTrocoReceberCheckout(
  valorCedula: number | null,
  restanteACobrir: number
): number {
  if (valorCedula == null || valorCedula <= 0 || restanteACobrir <= 0) return 0
  return Math.max(0, roundMoney(valorCedula - restanteACobrir))
}
