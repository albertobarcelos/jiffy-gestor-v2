import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

async function parseUploadError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new Error((errorData as { message?: string }).message || fallback)
}

export function extrairMenuIdsDoProdutoJson(produto: unknown): string[] {
  if (!produto || typeof produto !== 'object') return []
  const rec = produto as Record<string, unknown>
  const nested = rec.data && typeof rec.data === 'object' ? (rec.data as Record<string, unknown>) : rec
  const menus = nested.menus
  if (!Array.isArray(menus)) return []
  return [
    ...new Set(
      menus
        .map(item => {
          if (!item || typeof item !== 'object') return ''
          const row = item as Record<string, unknown>
          const nestedMenu = row.menu && typeof row.menu === 'object' ? (row.menu as Record<string, unknown>) : null
          return String(nestedMenu?.id ?? row.id ?? '').trim()
        })
        .filter(Boolean)
    ),
  ]
}

export function unirMenuIds(
  ...grupos: Array<Iterable<unknown> | string | null | undefined>
): string[] {
  const ids: string[] = []

  const coletar = (valor: unknown) => {
    if (valor == null) return
    if (typeof valor === 'string') {
      const t = valor.trim()
      if (t) ids.push(t)
      return
    }
    if (typeof valor === 'number' || typeof valor === 'boolean') {
      const t = String(valor).trim()
      if (t) ids.push(t)
      return
    }
    if (typeof valor === 'object' && Symbol.iterator in (valor as object)) {
      for (const item of valor as Iterable<unknown>) coletar(item)
    }
  }

  for (const grupo of grupos) coletar(grupo)
  return [...new Set(ids)]
}

export async function buscarMenuIdsDoProduto(params: {
  token: string
  produtoId: string
}): Promise<string[]> {
  const response = await fetchGestorApi(`/api/produtos/${params.produtoId}`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) return []
  const json = await response.json().catch(() => null)
  return extrairMenuIdsDoProdutoJson(json)
}

/**
 * Usa menus já conhecidos, depois os da resposta da API e, se ainda vazio,
 * busca o produto (create sem `menuIds` amarra o menu principal).
 */
export async function resolverMenuIdsParaImagemProduto(params: {
  token: string
  produtoId: string
  conhecidos?: Iterable<string>
  payloadProduto?: unknown
}): Promise<string[]> {
  const conhecidos = unirMenuIds(params.conhecidos, extrairMenuIdsDoProdutoJson(params.payloadProduto))
  if (conhecidos.length > 0) return conhecidos
  return buscarMenuIdsDoProduto({
    token: params.token,
    produtoId: params.produtoId,
  })
}

export function extrairImagemUrlDoProdutoJson(produto: unknown): string | null {
  if (!produto || typeof produto !== 'object') return null
  const rec = produto as Record<string, unknown>
  const nested = rec.data && typeof rec.data === 'object' ? (rec.data as Record<string, unknown>) : rec
  const image = nested.image && typeof nested.image === 'object' ? (nested.image as Record<string, unknown>) : null
  const url = nested.imagemUrl ?? nested.imageUrl ?? image?.imageUrl
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return trimmed || null
}

export async function uploadImagemProdutoNosMenus(params: {
  token: string
  produtoId: string
  menuIds: string[]
  file: File
}): Promise<void> {
  const ids = unirMenuIds(params.menuIds)
  if (ids.length === 0) {
    throw new Error('Vincule o produto a um cardápio para enviar a imagem')
  }

  for (const menuId of ids) {
    const form = new FormData()
    form.append('file', params.file)
    const response = await fetchGestorApi(
      `/api/menus/${menuId}/produtos/${params.produtoId}/imagem`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.token}` },
        body: form,
      }
    )
    if (!response.ok) await parseUploadError(response, 'Erro ao atualizar imagem do produto')
  }
}

export async function buscarMenusDaEmpresa(params: {
  token: string
}): Promise<Array<{ id: string; nome: string; tipo?: string }>> {
  const response = await fetchGestorApi('/api/menus?limit=100&offset=0', {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  if (!response.ok) return []
  const data = await response.json().catch(() => ({}))
  const items = Array.isArray(data.items) ? data.items : []
  return items
    .map((item: { id?: unknown; nome?: unknown; tipo?: unknown }) => ({
      id: String(item.id ?? '').trim(),
      nome: String(item.nome ?? 'Menu').trim() || 'Menu',
      tipo: typeof item.tipo === 'string' ? item.tipo : undefined,
    }))
    .filter(item => item.id)
}

export async function buscarIdMenuPrincipal(token: string): Promise<string | null> {
  const menus = await buscarMenusDaEmpresa({ token })
  const principal = menus.find(m => m.tipo === 'principal') ?? menus[0]
  return principal?.id ?? null
}

export async function vincularProdutoAosMenus(params: {
  token: string
  produtoId: string
  menuIds: string[]
}): Promise<void> {
  const add = unirMenuIds(params.menuIds)
  if (add.length === 0) return
  const response = await fetchGestorApi(`/api/produtos/${params.produtoId}/menus`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ add }),
  })
  if (!response.ok) await parseUploadError(response, 'Erro ao vincular o produto aos cardápios')
}

export async function aplicarImagemProdutoNosMenus(params: {
  token: string
  produtoId: string
  menuIds: string[]
  file: File
  vincularSeAusente?: boolean
}): Promise<void> {
  const ids = unirMenuIds(params.menuIds)
  if (ids.length === 0) return
  if (params.vincularSeAusente) {
    await vincularProdutoAosMenus({
      token: params.token,
      produtoId: params.produtoId,
      menuIds: ids,
    })
  }
  await uploadImagemProdutoNosMenus({
    token: params.token,
    produtoId: params.produtoId,
    menuIds: ids,
    file: params.file,
  })
}

export async function buscarPrimeiraImagemProdutoNosMenus(params: {
  token: string
  produtoId: string
  menuIds: string[]
}): Promise<string | null> {
  const ids = unirMenuIds(params.menuIds)
  for (const menuId of ids) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos/${params.produtoId}`, {
      headers: { Authorization: `Bearer ${params.token}` },
    })
    if (!response.ok) continue
    const json = await response.json().catch(() => null)
    const url = extrairImagemUrlDoProdutoJson(json)
    if (url) return url
  }
  return null
}
