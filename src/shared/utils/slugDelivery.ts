/** Mesma regra do backend (`Slug.ts`). */
export const SLUG_DELIVERY_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeDeliverySlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function validateDeliverySlug(slug: string): string | null {
  if (slug.length < 3) {
    return 'Slug deve conter pelo menos 3 caracteres'
  }
  if (!SLUG_DELIVERY_REGEX.test(slug)) {
    return 'Use apenas letras minúsculas, números e hífens (sem hífens nas extremidades ou consecutivos)'
  }
  return null
}
