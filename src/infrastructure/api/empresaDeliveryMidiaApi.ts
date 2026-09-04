import { getCardapioPublicBaseUrl } from '@/src/shared/utils/cardapioPublicUrl'

/**
 * Midia pública (logo/banner) para o Design no Gestor.
 * Lê o BFF público do Cardápio — sem proxy de catálogo no ERP.
 */
export function buildCardapioCatalogoPublicUrl(
  slug: string,
  params: { limit?: number; offset?: number } = { limit: 1, offset: 0 }
): string {
  const base = getCardapioPublicBaseUrl()
  if (!base) {
    throw new Error(
      'Configure NEXT_PUBLIC_CARDAPIO_PUBLIC_URL para carregar logo/capa no Design.'
    )
  }
  const clean = slug.trim()
  if (!clean) {
    throw new Error('Slug da loja é obrigatório.')
  }
  const qs = new URLSearchParams()
  if (params.offset != null) qs.set('offset', String(params.offset))
  if (params.limit != null) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return `${base}/api/public/delivery/catalogo/${encodeURIComponent(clean)}${
    query ? `?${query}` : ''
  }`
}

export async function fetchEmpresaPublicaMidia(slug: string): Promise<{
  logoUrl: string | null
  bannerUrl: string | null
}> {
  const url = buildCardapioCatalogoPublicUrl(slug, { limit: 1, offset: 0 })
  const res = await fetch(url, { cache: 'no-store', credentials: 'omit' })
  if (!res.ok) {
    throw new Error(`Falha ao carregar mídia da loja (${res.status})`)
  }
  const body = (await res.json()) as {
    empresa?: { logoUrl?: string | null; bannerUrl?: string | null }
  }
  return {
    logoUrl: body.empresa?.logoUrl ?? null,
    bannerUrl: body.empresa?.bannerUrl ?? null,
  }
}
