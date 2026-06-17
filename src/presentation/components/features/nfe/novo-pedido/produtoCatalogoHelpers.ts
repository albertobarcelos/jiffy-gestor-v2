import type { Produto } from '@/src/domain/entities/Produto'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  normalizarUnidadeMedidaProduto,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'

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

export function obterUnidadeMedidaProdutoLinha(
  linha: Pick<ProdutoSelecionado, 'produtoId' | 'unidadeMedida'>,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): UnidadeMedidaProduto {
  if (linha.unidadeMedida) {
    return normalizarUnidadeMedidaProduto(linha.unidadeMedida)
  }
  const catalogo = obterProdutoDoCatalogo(linha.produtoId, catalogoProdutosPorId, produtosList)
  return catalogo?.getUnidadeMedida() ?? 'UN'
}
