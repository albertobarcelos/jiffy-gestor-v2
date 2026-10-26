import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export type WebAppManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

export type WebAppManifest = {
  name: string
  short_name: string
  description: string
  start_url: string
  scope: string
  display: 'standalone'
  background_color: string
  theme_color: string
  icons: WebAppManifestIcon[]
  lang: string
  dir: 'ltr'
}

function truncar(texto: string, max: number): string {
  const t = texto.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

export function montarWebAppManifest(empresa: EmpresaPublicaDTO): WebAppManifest {
  const slug = empresa.slug.trim()
  const nome = empresa.nomeFantasia?.trim() || 'Cardápio digital'
  const shortName = truncar(nome, 12)
  const startUrl = `/${encodeURIComponent(slug)}/`
  const iconBase = `/api/public/delivery/pwa-icon/${encodeURIComponent(slug)}`

  return {
    name: nome,
    short_name: shortName,
    description: `Peça online no cardápio de ${nome}.`,
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111827',
    lang: 'pt-BR',
    dir: 'ltr',
    icons: [
      {
        src: `${iconBase}?size=192`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${iconBase}?size=512`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${iconBase}?size=192`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${iconBase}?size=512`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
