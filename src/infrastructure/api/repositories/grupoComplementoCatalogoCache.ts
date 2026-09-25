import {
  gruposComplementosPrecisamHidratacao,
  type ProdutoGrupoComplementoCatalogo,
} from '@/src/application/mappers/MenuProdutoCatalogMapper'
import type { IGrupoComplementoCatalogoCache } from '@/src/application/ports/IGrupoComplementoCatalogoCache'

const cachePorId = new Map<string, ProdutoGrupoComplementoCatalogo>()

export function snapshotCacheGruposComplementosCatalogo(): Map<
  string,
  ProdutoGrupoComplementoCatalogo
> {
  return new Map(cachePorId)
}

export function gravarGruposComplementosNoCache(
  grupos: ProdutoGrupoComplementoCatalogo[]
): void {
  for (const grupo of grupos) {
    if (!grupo.id.trim()) continue
    if (gruposComplementosPrecisamHidratacao([grupo])) continue
    cachePorId.set(grupo.id, grupo)
  }
}

export function limparCacheGruposComplementosCatalogo(): void {
  cachePorId.clear()
}

export function removerGruposComplementosDoCache(ids: string[]): void {
  for (const id of ids) {
    const chave = id.trim()
    if (chave) cachePorId.delete(chave)
  }
}

export function removerGruposComplementosDoCachePorComplementoId(complementoId: string): void {
  const alvo = complementoId.trim()
  if (!alvo) return
  for (const [grupoId, grupo] of cachePorId) {
    if (grupo.complementos.some(item => item.id === alvo)) {
      cachePorId.delete(grupoId)
    }
  }
}

export class GrupoComplementoCatalogoCacheAdapter implements IGrupoComplementoCatalogoCache {
  limpar(): void {
    limparCacheGruposComplementosCatalogo()
  }

  removerPorIds(ids: string[]): void {
    removerGruposComplementosDoCache(ids)
  }

  removerPorComplementoId(complementoId: string): void {
    removerGruposComplementosDoCachePorComplementoId(complementoId)
  }
}

export const grupoComplementoCatalogoCache = new GrupoComplementoCatalogoCacheAdapter()

