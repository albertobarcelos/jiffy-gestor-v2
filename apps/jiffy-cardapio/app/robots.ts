import type { MetadataRoute } from 'next'
import { cardapioPublicBaseUrl } from '@/src/infrastructure/seo/cardapioPublicBaseUrl'

export default function robots(): MetadataRoute.Robots {
  const base = cardapioPublicBaseUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/*/carrinho', '/*/pedido/'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
