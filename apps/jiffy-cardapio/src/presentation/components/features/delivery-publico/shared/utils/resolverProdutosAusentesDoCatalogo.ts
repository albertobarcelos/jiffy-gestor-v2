import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { ProdutoIndisponivelCarrinho } from '@/src/application/errors/publicDeliveryErrors'
import { findCatalogoProdutoById } from './findCatalogoProdutoById'

/**
 * Itens do carrinho cujo produtoId não aparece mais no catálogo público
 * (pausado no menu ou soft delete — some da listagem).
 */
export function resolverProdutosAusentesDoCatalogo(
  itens: ReadonlyArray<{ produtoId: string; produtoNome: string }>,
  grupos: CatalogoPublicoGrupoProdutoDTO[]
): ProdutoIndisponivelCarrinho | null {
  if (itens.length === 0 || grupos.length === 0) return null

  const vistos = new Set<string>()
  const produtoIds: string[] = []
  const nomes: string[] = []

  for (const item of itens) {
    const id = item.produtoId.trim()
    if (!id || vistos.has(id)) continue
    if (findCatalogoProdutoById(grupos, id)) continue
    vistos.add(id)
    produtoIds.push(id)
    nomes.push(item.produtoNome.trim() || id)
  }

  if (produtoIds.length === 0) return null
  return { produtoIds, nomes }
}
