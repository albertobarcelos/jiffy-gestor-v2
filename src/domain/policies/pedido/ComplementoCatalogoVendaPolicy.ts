/**
 * Regras de exibição/seleção de complementos no pedido (balcão/delivery).
 * `ativo === false` = pausado no produto deste cardápio (ComplementoMenuConfig).
 */

export function complementoVisivelNoPedido(comp: { ativo?: boolean }): boolean {
  return comp.ativo !== false
}

export function ordenarComplementosParaPedido<T extends { nome: string; ordem?: number }>(
  itens: readonly T[]
): T[] {
  return [...itens].sort((a, b) => {
    const oa = a.ordem
    const ob = b.ordem
    if (oa != null && ob != null && oa !== ob) return oa - ob
    if (oa != null && ob == null) return -1
    if (oa == null && ob != null) return 1
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  })
}

/** Complementos ativos no cardápio, na ordem efetiva. */
export function listarComplementosVisiveisNoPedido<
  T extends { ativo?: boolean; nome: string; ordem?: number },
>(complementos: readonly T[] | undefined | null): T[] {
  if (!complementos?.length) return []
  return ordenarComplementosParaPedido(complementos.filter(complementoVisivelNoPedido))
}
