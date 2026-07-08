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

export async function resolveGrupoProdutoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoProdutoId: string
): Promise<string | null> {
  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return null

  const limit = DELIVERY_CATALOGO_PAGE_LIMIT
  let offset = 0

  for (let page = 0; page < 50; page += 1) {
    const catalogo = await fetchCatalogoPagina(apiClient, slug, offset, limit)
    if (!catalogo) return null

    const grupo = catalogo.gruposProdutos?.find(item => item.id === grupoProdutoId)
    if (grupo) {
      return grupo.imagemUrl ?? null
    }

    if (!catalogo.paginacao?.hasNext) break
    offset += limit
  }

  return null
}

export async function resolveGrupoComplementoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  grupoComplementoId: string
): Promise<string | null> {
  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return null

  const catalogo = await fetchCatalogoPagina(apiClient, slug, 0, DELIVERY_CATALOGO_PAGE_LIMIT)
  const grupo = catalogo?.gruposComplementos?.find(item => item.id === grupoComplementoId)
  return grupo?.imagemUrl ?? null
}

export async function resolveProdutoImagemUrlFromDeliveryCatalog(
  apiClient: ApiClient,
  token: string,
  produtoId: string
): Promise<string | null> {
  const slug = await resolveEmpresaDeliverySlug(apiClient, token)
  if (!slug) return null

  const limit = DELIVERY_CATALOGO_PAGE_LIMIT
  let offset = 0

  for (let page = 0; page < 50; page += 1) {
    const catalogo = await fetchCatalogoPagina(apiClient, slug, offset, limit)
    if (!catalogo) return null

    for (const grupo of catalogo.gruposProdutos ?? []) {
      const produto = grupo.produtos?.find(item => item.id === produtoId)
      if (produto) {
        return produto.imagemUrl ?? null
      }
    }

    if (!catalogo.paginacao?.hasNext) break
    offset += limit
  }

  return null
}
