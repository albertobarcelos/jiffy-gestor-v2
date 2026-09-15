import { ApiClient } from '@/src/infrastructure/api/apiClient'

/** Limite máximo aceito pelo GET /delivery/catalogo/:slug (backend: max 20). */
const DELIVERY_CATALOGO_PAGE_LIMIT = 20

type CatalogoPaginaResponse = {
  catalogo?: {
    gruposProdutos?: Array<{
      id: string
      imagemUrl: string | null
      produtos?: Array<{ id: string; imagemUrl: string | null }> | null
    }> | null
    gruposComplementos?: Array<{ id: string; imagemUrl: string | null }> | null
    complementos?: Array<{ id: string; imagemUrl: string | null }> | null
    paginacao?: {
      hasNext?: boolean
    }
  }
}

type EmpresaDeliveryMeResponse = {
  slug?: string
}

async function resolveEmpresaDeliverySlug(
  apiClient: ApiClient,
  token: string
): Promise<string | null> {
  try {
    const response = await apiClient.request<EmpresaDeliveryMeResponse>(
      '/api/v1/delivery/empresas/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )
    const slug = response.data?.slug?.trim()
    return slug || null
  } catch {
    return null
  }
}

async function fetchCatalogoPagina(
  apiClient: ApiClient,
  slug: string,
  offset: number,
  limit: number
): Promise<CatalogoPaginaResponse['catalogo'] | null> {
  const safeLimit = Math.min(Math.max(limit, 1), DELIVERY_CATALOGO_PAGE_LIMIT)
  const response = await apiClient.request<CatalogoPaginaResponse>(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug)}?offset=${offset}&limit=${safeLimit}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  )
  return response.data?.catalogo ?? null
}

export async function resolveGruposProdutoImagemUrlsFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoProdutoIds: string[]
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(grupoProdutoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )

  if (uniqueIds.length === 0) return result

  const pending = new Set(uniqueIds)
  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return result

  const limit = DELIVERY_CATALOGO_PAGE_LIMIT
  let offset = 0

  for (let page = 0; page < 50 && pending.size > 0; page += 1) {
    const catalogo = await fetchCatalogoPagina(apiClient, slug, offset, limit)
    if (!catalogo) break

    for (const grupo of catalogo.gruposProdutos ?? []) {
      if (!pending.has(grupo.id)) continue
      result[grupo.id] = grupo.imagemUrl ?? null
      pending.delete(grupo.id)
    }

    if (!catalogo.paginacao?.hasNext) break
    offset += limit
  }

  return result
}

export async function resolveGrupoProdutoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoProdutoId: string
): Promise<string | null> {
  const map = await resolveGruposProdutoImagemUrlsFromDeliveryCatalog(apiClient, token, [
    grupoProdutoId,
  ])
  return map[grupoProdutoId.trim()] ?? null
}

export async function resolveGruposComplementoImagemUrlsFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoComplementoIds: string[]
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(grupoComplementoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )

  if (uniqueIds.length === 0) return result

  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return result

  // gruposComplementos só vêm na primeira página do catálogo público
  const catalogo = await fetchCatalogoPagina(apiClient, slug, 0, DELIVERY_CATALOGO_PAGE_LIMIT)
  for (const grupo of catalogo?.gruposComplementos ?? []) {
    if (!(grupo.id in result)) continue
    result[grupo.id] = grupo.imagemUrl ?? null
  }

  return result
}

export async function resolveGrupoComplementoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoComplementoId: string
): Promise<string | null> {
  const map = await resolveGruposComplementoImagemUrlsFromDeliveryCatalog(
    apiClient,
    token,
    [grupoComplementoId]
  )
  return map[grupoComplementoId.trim()] ?? null
}

export async function resolveProdutosImagemUrlsFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  produtoIds: string[]
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(produtoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )

  if (uniqueIds.length === 0) return result

  const pending = new Set(uniqueIds)
  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return result

  const limit = DELIVERY_CATALOGO_PAGE_LIMIT
  let offset = 0

  for (let page = 0; page < 50 && pending.size > 0; page += 1) {
    const catalogo = await fetchCatalogoPagina(apiClient, slug, offset, limit)
    if (!catalogo) break

    for (const grupo of catalogo.gruposProdutos ?? []) {
      for (const produto of grupo.produtos ?? []) {
        if (!pending.has(produto.id)) continue
        result[produto.id] = produto.imagemUrl ?? null
        pending.delete(produto.id)
      }
    }

    if (!catalogo.paginacao?.hasNext) break
    offset += limit
  }

  return result
}

export async function resolveProdutoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  produtoId: string
): Promise<string | null> {
  const map = await resolveProdutosImagemUrlsFromDeliveryCatalog(apiClient, token, [produtoId])
  return map[produtoId.trim()] ?? null
}

export async function resolveComplementosImagemUrlsFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  complementoIds: string[]
): Promise<Record<string, string | null>> {
  const uniqueIds = [...new Set(complementoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )

  if (uniqueIds.length === 0) return result

  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return result

  // complementos só vêm na primeira página do catálogo público
  const catalogo = await fetchCatalogoPagina(apiClient, slug, 0, DELIVERY_CATALOGO_PAGE_LIMIT)
  for (const complemento of catalogo?.complementos ?? []) {
    if (!(complemento.id in result)) continue
    result[complemento.id] = complemento.imagemUrl ?? null
  }

  return result
}

export async function resolveComplementoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  complementoId: string
): Promise<string | null> {
  const map = await resolveComplementosImagemUrlsFromDeliveryCatalog(apiClient, token, [
    complementoId,
  ])
  return map[complementoId.trim()] ?? null
}
