import type {
  CatalogoPublicoGrupoProdutoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export function findCatalogoProdutoById(
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  produtoId: string
): CatalogoPublicoProdutoDTO | null {
  for (const grupo of grupos) {
    const produto = grupo.produtos.find(p => p.id === produtoId)
    if (produto) return produto
  }
  return null
}
