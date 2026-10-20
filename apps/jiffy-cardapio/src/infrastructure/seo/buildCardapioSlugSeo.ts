import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { latLngFromGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { cardapioSlugUrl } from './cardapioPublicBaseUrl'

export function cidadeEmpresaPublica(empresa: EmpresaPublicaDTO): string | null {
  const cidade = empresa.endereco?.cidade?.trim()
  return cidade || null
}

export function tituloCardapioSlug(empresa: EmpresaPublicaDTO): string {
  const nome = empresa.nomeFantasia.trim() || 'Cardápio'
  const cidade = cidadeEmpresaPublica(empresa)
  if (cidade) return `${nome} | Delivery em ${cidade}`
  return `${nome} | Cardápio delivery`
}

export function descricaoCardapioSlug(empresa: EmpresaPublicaDTO): string {
  const nome = empresa.nomeFantasia.trim() || 'esta loja'
  const cidade = cidadeEmpresaPublica(empresa)
  const local = cidade ? ` em ${cidade}` : ''
  return `Peça no ${nome}${local}. Cardápio online, entrega e retirada.`
}

export function jsonLdCardapioSlug(empresa: EmpresaPublicaDTO): Record<string, unknown> {
  const url = cardapioSlugUrl(empresa.slug)
  const cidade = cidadeEmpresaPublica(empresa)
  const coords = latLngFromGeoJsonPoint(empresa.localizacao)
  const endereco = empresa.endereco

  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: empresa.nomeFantasia.trim() || empresa.slug,
    url,
    ...(empresa.telefone?.trim() ? { telephone: empresa.telefone.trim() } : {}),
    ...(empresa.logoUrl?.trim() ? { image: empresa.logoUrl.trim() } : {}),
    ...(empresa.segmento?.trim() ? { servesCuisine: empresa.segmento.trim() } : {}),
    ...(endereco
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: [endereco.rua, endereco.numero].filter(Boolean).join(', '),
            addressLocality: endereco.cidade,
            addressRegion: endereco.estado,
            postalCode: endereco.cep,
            addressCountry: 'BR',
          },
        }
      : {}),
    ...(coords
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: coords.lat,
            longitude: coords.lng,
          },
        }
      : {}),
    ...(cidade ? { areaServed: cidade } : {}),
  }
}
