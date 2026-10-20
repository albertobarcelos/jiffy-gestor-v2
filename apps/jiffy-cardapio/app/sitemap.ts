import type { MetadataRoute } from 'next'
import { cardapioSlugUrl } from '@/src/infrastructure/seo/cardapioPublicBaseUrl'
import { fetchSlugsPublicosUpstream } from '@/src/infrastructure/seo/fetchSlugsPublicosUpstream'

/** Só o backend. Loja nova no sitemap em até 1h. */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchSlugsPublicosUpstream()
  return slugs.map(slug => ({
    url: cardapioSlugUrl(slug),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))
}
