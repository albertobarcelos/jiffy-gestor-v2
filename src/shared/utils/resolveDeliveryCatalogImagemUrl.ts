import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { parseImagemUrlProdutoIndex } from '@/src/shared/utils/catalogoProdutoIndex'

/** Limite máximo aceito pelo GET /delivery/catalogo/:slug (backend: max 20). */
const DELIVERY_CATALOGO_PAGE_LIMIT = 20

type CatalogoItemComId = {
  id?: unknown
  [key: string]: unknown
}

type CatalogoGrupoProduto = CatalogoItemComId & {
  produtos?: CatalogoItemComId[] | null
}

export type CatalogoDeliveryPagina = {
  gruposProdutos?: CatalogoGrupoProduto[] | null
  gruposComplementos?: CatalogoItemComId[] | null
  complementos?: CatalogoItemComId[] | null
  paginacao?: {
    hasNext?: boolean
  }
}

type EmpresaDeliveryMeResponse = {
  slug?: string
}

function idDoItem(item: CatalogoItemComId | null | undefined): string {
  if (item?.id == null) return ''
  return String(item.id).trim()
}

function imagemUrlDoItem(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  return parseImagemUrlProdutoIndex(item as Record<string, unknown>)
}

export function extrairCatalogoDeliveryDoPayload(payload: unknown): CatalogoDeliveryPagina | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const rec = payload as Record<string, unknown>
  const nested =
    rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec
  const catalogoRaw = nested.catalogo
  const catalogo =
    catalogoRaw && typeof catalogoRaw === 'object' && !Array.isArray(catalogoRaw)
      ? (catalogoRaw as Record<string, unknown>)
      : nested.gruposProdutos != null || nested.complementos != null || nested.gruposComplementos != null
        ? nested
        : null
  if (!catalogo) return null
  return catalogo as CatalogoDeliveryPagina
}

export function mapearImagensComplementosDoCatalogo(
  catalogo: CatalogoDeliveryPagina | null | undefined,
  complementoIds: string[]
): Record<string, string | null> {
  const uniqueIds = [...new Set(complementoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )
  if (uniqueIds.length === 0) return result

  for (const complemento of catalogo?.complementos ?? []) {
    const id = idDoItem(complemento)
    if (!(id in result) || result[id]) continue
    result[id] = imagemUrlDoItem(complemento)
  }

  return result
}

export function mapearImagensGruposComplementoDoCatalogo(
  catalogo: CatalogoDeliveryPagina | null | undefined,
  grupoComplementoIds: string[]
): Record<string, string | null> {
  const uniqueIds = [...new Set(grupoComplementoIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, string | null> = Object.fromEntries(
    uniqueIds.map(id => [id, null])
  )
  if (uniqueIds.length === 0) return result

  for (const grupo of catalogo?.gruposComplementos ?? []) {
    const id = idDoItem(grupo)
    if (!(id in result)) continue
    result[id] = imagemUrlDoItem(grupo)
  }

  return result
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
): Promise<CatalogoDeliveryPagina | null> {
  const safeLimit = Math.min(Math.max(limit, 1), DELIVERY_CATALOGO_PAGE_LIMIT)
  const response = await apiClient.request<unknown>(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug)}?offset=${offset}&limit=${safeLimit}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  )
  return extrairCatalogoDeliveryDoPayload(response.data)
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
      const id = idDoItem(grupo)
      if (!pending.has(id)) continue
      result[id] = imagemUrlDoItem(grupo)
      pending.delete(id)
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
  return {
    ...result,
    ...mapearImagensGruposComplementoDoCatalogo(catalogo, uniqueIds),
  }
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
        const id = idDoItem(produto)
        if (!pending.has(id)) continue
        result[id] = imagemUrlDoItem(produto)
        pending.delete(id)
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
  return {
    ...result,
    ...mapearImagensComplementosDoCatalogo(catalogo, uniqueIds),
  }
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
