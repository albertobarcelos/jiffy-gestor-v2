import { isReservedCardapioSlug } from './reservedCardapioSlugs'

function slugValido(value: unknown): string | null {
  if (typeof value === 'string') {
    const slug = value.trim().toLowerCase()
    if (!slug || isReservedCardapioSlug(slug)) return null
    return slug
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>
    return slugValido(rec.slug ?? rec.slugPublico)
  }
  return null
}

function coletarLista(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return null
  const rec = value as Record<string, unknown>
  if (Array.isArray(rec.slugs)) return rec.slugs
  if (rec.data && typeof rec.data === 'object') {
    const data = rec.data as Record<string, unknown>
    if (Array.isArray(rec.data)) return rec.data
    if (Array.isArray(data.slugs)) return data.slugs
  }
  return null
}

/** Aceita `{ slugs }`, `{ data: { slugs } }` ou array. Sem id, telefone ou endereço. */
export function parseSlugsPublicos(body: unknown): string[] {
  const lista = coletarLista(body)
  if (!lista) return []
  const seen = new Set<string>()
  const slugs: string[] = []
  for (const item of lista) {
    const slug = slugValido(item)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    slugs.push(slug)
  }
  return slugs
}
