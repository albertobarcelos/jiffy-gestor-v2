const RESERVED = new Set([
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
  'manifest.json',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'apple-touch-icon-precomposed.png',
])

/** Paths do host que não são loja — o Google pedia /robots.txt e caía no [slug]. */
export function isReservedCardapioSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase())
}
