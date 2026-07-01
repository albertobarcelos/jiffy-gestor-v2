export type UnidadeMedidaProduto = 'UN' | 'KG' | 'LT'

const UNIDADES_VALIDAS = new Set<UnidadeMedidaProduto>(['UN', 'KG', 'LT'])

export function normalizarUnidadeMedidaProduto(raw: unknown): UnidadeMedidaProduto {
  const codigo = String(raw ?? 'UN')
    .trim()
    .toUpperCase()
  if (UNIDADES_VALIDAS.has(codigo as UnidadeMedidaProduto)) {
    return codigo as UnidadeMedidaProduto
  }
  return 'UN'
}

/** KG/LT permitem quantidade fracionária no lançamento. */
export function produtoPermiteQuantidadeDecimal(unidade: UnidadeMedidaProduto): boolean {
  return unidade === 'KG' || unidade === 'LT'
}

/** Regra 1:1 complemento × produto aplica-se apenas a produtos unitários. */
export function produtoUsaRegraComplementoUnitario(unidade: UnidadeMedidaProduto): boolean {
  return unidade === 'UN'
}

/** Label curta para listagens (ex.: carrinho do pedido). */
export function formatarUnidadeMedidaProdutoExibicao(unidade: UnidadeMedidaProduto): string {
  if (unidade === 'KG') return 'KG'
  if (unidade === 'LT') return 'LT'
  return 'UN'
}
