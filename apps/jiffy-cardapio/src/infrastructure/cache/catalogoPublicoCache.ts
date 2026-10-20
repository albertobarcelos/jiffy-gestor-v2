/** ISR / Data Cache por slug — nunca um documento global das 200 lojas. */
export const CATALOGO_PUBLICO_REVALIDATE_SECONDS = 30
export const CATALOGO_PUBLICO_SWR_SECONDS = 60

export function catalogoPublicoCacheTag(slug: string): string {
  return `catalogo-publico:${slug.trim()}`
}

export function catalogoPublicoCacheControl(): string {
  return `public, s-maxage=${CATALOGO_PUBLICO_REVALIDATE_SECONDS}, stale-while-revalidate=${CATALOGO_PUBLICO_SWR_SECONDS}`
}
