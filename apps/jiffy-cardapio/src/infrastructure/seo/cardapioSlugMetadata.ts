import type { Metadata } from 'next'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  descricaoCardapioSlug,
  tituloCardapioSlug,
} from './buildCardapioSlugSeo'
import { cardapioSlugUrl } from './cardapioPublicBaseUrl'

export function metadataCardapioSlug(empresa: EmpresaPublicaDTO): Metadata {
  const title = tituloCardapioSlug(empresa)
  const description = descricaoCardapioSlug(empresa)
  const url = cardapioSlugUrl(empresa.slug)
  const image = empresa.logoUrl?.trim() || empresa.bannerUrl?.trim() || undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'pt_BR',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  }
}

export const metadataCardapioNaoIndexavel: Metadata = {
  robots: { index: false, follow: false },
}
