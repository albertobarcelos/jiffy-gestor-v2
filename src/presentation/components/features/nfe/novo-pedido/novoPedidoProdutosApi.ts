import { Produto } from '@/src/domain/entities/Produto'

const PRODUTOS_POR_PAGINA = 100

type ProdutosGrupoResponse = {
  items?: unknown[]
  count?: number
  hasMore?: boolean
  nextOffset?: number | null
}

/**
 * Carrega todos os produtos de um grupo (pagina com limit/offset até esgotar).
 */
export async function fetchProdutosDoGrupo(
  grupoId: string,
  token: string
): Promise<{ produtos: Produto[]; count: number }> {
  const produtos: Produto[] = []
  let offset = 0

  while (true) {
    const response = await fetch(
      `/api/grupos-produtos/${grupoId}/produtos?limit=${PRODUTOS_POR_PAGINA}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { message?: string }).message || 'Erro ao carregar produtos do grupo'
      )
    }

    const data = (await response.json()) as ProdutosGrupoResponse
    const items = Array.isArray(data.items) ? data.items : []
    produtos.push(...items.map(item => Produto.fromJSON(item)))

    if (items.length < PRODUTOS_POR_PAGINA) break

    if (typeof data.nextOffset === 'number') {
      offset = data.nextOffset
      continue
    }

    offset += PRODUTOS_POR_PAGINA
  }

  return {
    produtos,
    count: produtos.length,
  }
}
