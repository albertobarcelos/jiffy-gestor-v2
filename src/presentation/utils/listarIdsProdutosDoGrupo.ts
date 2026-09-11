'use client'

import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

const PAGE_SIZE = 100
const MAX_IDS = 10_000

/**
 * IDs de produtos do cadastro base numa categoria.
 * Usado para incluir/excluir a categoria inteira de um cardápio
 * (não existe POST de vínculo vazio de grupo no menu).
 */
export async function listarIdsProdutosDoGrupo(grupoProdutoId: string): Promise<string[]> {
  const id = grupoProdutoId.trim()
  if (!id) return []

  const ids: string[] = []
  let offset = 0

  while (ids.length < MAX_IDS) {
    const params = new URLSearchParams({
      grupoProdutoId: id,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    const response = await fetchGestorApi(`/api/produtos?${params.toString()}`)
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string }
      throw new Error(body.message || 'Erro ao listar produtos da categoria')
    }
    const data = (await response.json()) as { items?: Array<{ id?: string }> }
    const items = data.items ?? []
    for (const item of items) {
      if (item.id) ids.push(String(item.id))
    }
    if (items.length < PAGE_SIZE) break
    offset += items.length
  }

  return ids
}
