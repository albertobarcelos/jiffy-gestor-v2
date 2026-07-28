/** Item de pagamento lançado no checkout público. */
export type CheckoutPagamentoItem = {
  meioPagamentoId: string
  valor: number
}

const TOLERANCIA_CENTAVOS = 0.01

export function roundMoneyCheckout(value: number): number {
  return Math.round(value * 100) / 100
}

function roundMoney(value: number): number {
  return roundMoneyCheckout(value)
}

function emCentavos(valor: number): number {
  return Math.round(valor * 100)
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
 * Espelha a lógica do gestor (`calcularTrocoPedido`).
 */
export function calcularTrocoCheckout(
  total: number,
  pagamentos: CheckoutPagamentoItem[],
  isDinheiro: (meioPagamentoId: string) => boolean
): number {
  if (pagamentos.length === 0) return 0

  for (let i = pagamentos.length - 1; i >= 0; i--) {
    const p = pagamentos[i]
    if (!p || !isDinheiro(p.meioPagamentoId)) continue

    const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => acc + x.valor, 0)
    const valorFaltavaPagar = roundMoney(total - totalAntes)

    if (p.valor - valorFaltavaPagar > TOLERANCIA_CENTAVOS) {
      return roundMoney(p.valor - Math.max(0, valorFaltavaPagar))
    }
    return 0
  }

  return 0
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
  const diffCentavos = Math.abs(emCentavos(soma) - emCentavos(total))
  if (diffCentavos <= Math.round(TOLERANCIA_CENTAVOS * 100)) return true
  if (soma <= total) return false
  if (!isDinheiro) return false
  return calcularTrocoCheckout(total, pagamentos, isDinheiro) > TOLERANCIA_CENTAVOS
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
