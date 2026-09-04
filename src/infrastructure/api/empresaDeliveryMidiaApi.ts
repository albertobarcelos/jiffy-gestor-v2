/**
 * Midia pública da empresa (logo/banner) para o Design no Gestor.
 * Usa rota autenticada — o BFF público vive só no apps/jiffy-cardapio.
 */

export async function fetchEmpresaPublicaMidia(slug: string): Promise<{
  logoUrl: string | null
  bannerUrl: string | null
}> {
  const url = `/api/delivery/catalogo-empresa/${encodeURIComponent(slug)}?limit=1&offset=0`
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
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
