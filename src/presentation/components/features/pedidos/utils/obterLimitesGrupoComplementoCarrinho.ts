import type { Produto } from '@/src/domain/entities/Produto'
import type { GrupoComplementoLimites } from '@/src/domain/policies/pedido/GrupoComplementoLimitesPolicy'
import { snapshotCacheGruposComplementosCatalogo } from '@/src/infrastructure/api/repositories/grupoComplementoCatalogoCache'

/** Resolve mínimos/máximos do grupo pelo produto hidratado ou pelo cache de catálogo. */
export function obterLimitesGrupoComplementoCarrinho(
  produtoCatalogo: Produto | null | undefined,
  grupoId: string
): GrupoComplementoLimites | null {
  const id = grupoId.trim()
  if (!id) return null

  const doProduto = produtoCatalogo
    ?.getGruposComplementos()
    ?.find(grupo => grupo.id === id)
  if (doProduto) {
    return {
      id: doProduto.id,
      nome: doProduto.nome,
      qtdMinima: doProduto.qtdMinima,
      qtdMaxima: doProduto.qtdMaxima,
    }
  }

  const doCache = snapshotCacheGruposComplementosCatalogo().get(id)
  if (!doCache) return null

  return {
    id: doCache.id,
    nome: doCache.nome,
    qtdMinima: doCache.qtdMinima,
    qtdMaxima: doCache.qtdMaxima,
  }
}
