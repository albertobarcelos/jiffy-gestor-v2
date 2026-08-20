'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { Menu, MenuProduto } from '@/src/shared/types/menus'

export const PRODUTOS_IMAGENS_CADASTRO_QUERY_KEY = ['produtos-imagens-cadastro'] as const

const PAGE_SIZE = 100
const MAX_PAGES_PER_MENU = 20

function imageUrlOf(produto: MenuProduto): string | null {
  const url = produto.image?.imageUrl
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return trimmed || null
}

async function listarPaginaProdutosDoMenu(
  token: string,
  menuId: string,
  offset: number
): Promise<MenuProduto[]> {
  const searchParams = new URLSearchParams()
  searchParams.set('limit', String(PAGE_SIZE))
  searchParams.set('offset', String(offset))
  searchParams.set('tipo', 'all')

  const response = await fetchGestorApi(`/api/menus/${menuId}/produtos?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return []
  const data = await response.json().catch(() => ({}))
  return Array.isArray(data.items) ? (data.items as MenuProduto[]) : []
}

/**
 * Mapa produtoId → URL da imagem no snapshot dos menus (principal primeiro).
 * A listagem do cadastro base não traz a foto do MenuProduto.
 */
export function useImagensProdutosCadastroBase() {
  return useSecureTenantQuery<Record<string, string>>(
    PRODUTOS_IMAGENS_CADASTRO_QUERY_KEY,
    async ({ token }) => {
      const menusResponse = await fetchGestorApi('/api/menus?limit=50&offset=0', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!menusResponse.ok) return {}

      const menusData = await menusResponse.json().catch(() => ({}))
      const menus = (Array.isArray(menusData.items) ? menusData.items : []) as Menu[]
      const ordenados = [...menus].sort((a, b) => {
        if (a.tipo === 'principal' && b.tipo !== 'principal') return -1
        if (b.tipo === 'principal' && a.tipo !== 'principal') return 1
        return 0
      })

      const imagens: Record<string, string> = {}

      for (const menu of ordenados) {
        let offset = 0
        for (let page = 0; page < MAX_PAGES_PER_MENU; page += 1) {
          const items = await listarPaginaProdutosDoMenu(token, menu.id, offset)
          for (const item of items) {
            const url = imageUrlOf(item)
            if (url && !imagens[item.produtoId]) {
              imagens[item.produtoId] = url
            }
          }
          if (items.length < PAGE_SIZE) break
          offset += items.length
        }
      }

      return imagens
    },
    { staleTime: 1000 * 60 }
  )
}
