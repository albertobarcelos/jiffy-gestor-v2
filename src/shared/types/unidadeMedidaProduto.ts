export type UnidadeMedidaProduto = 'UN' | 'KG' | 'LT'

const UNIDADES_VALIDAS = new Set<UnidadeMedidaProduto>(['UN', 'KG', 'LT'])

/** Opções do select de unidade (código + rótulo amigável). */
export const UNIDADES_MEDIDA_PRODUTO_OPCOES: ReadonlyArray<{
  value: UnidadeMedidaProduto
  label: string
}> = [
  { value: 'UN', label: 'UN — Unidade' },
  { value: 'KG', label: 'KG — Quilograma' },
  { value: 'LT', label: 'LT — Litro' },
]

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

/** Label completa para selects / formulários. */
export function formatarUnidadeMedidaProdutoLabel(unidade: UnidadeMedidaProduto): string {
  const opcao = UNIDADES_MEDIDA_PRODUTO_OPCOES.find(o => o.value === unidade)
  return opcao?.label ?? 'UN — Unidade'
}
