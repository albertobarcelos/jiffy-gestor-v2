import type { Produto } from '@/src/domain/entities/Produto'

export function obterProdutoDoCatalogo(
  produtoId: string,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): Produto | undefined {
  return catalogoProdutosPorId[produtoId] ?? produtosList.find(p => p.getId() === produtoId)
}

export function produtoPermiteAlterarPreco(
  produtoId: string,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): boolean {
  return obterProdutoDoCatalogo(produtoId, catalogoProdutosPorId, produtosList)?.permiteAlterarPrecoAtivo() ?? false
}
