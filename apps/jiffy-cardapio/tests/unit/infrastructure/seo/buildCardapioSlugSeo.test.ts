import { describe, expect, it } from 'vitest'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  descricaoCardapioSlug,
  jsonLdCardapioSlug,
  tituloCardapioSlug,
} from '@/src/infrastructure/seo/buildCardapioSlugSeo'
import { isReservedCardapioSlug } from '@/src/infrastructure/seo/reservedCardapioSlugs'

function empresa(over: Partial<EmpresaPublicaDTO> = {}): EmpresaPublicaDTO {
  return {
    id: 'e1',
    nomeFantasia: 'Papaleguas Burgers',
    slug: 'nexsyn',
    telefone: '65999999999',
    segmento: 'Hamburgueria',
    logoUrl: 'https://cdn.example/logo.jpg',
    bannerUrl: null,
    endereco: {
      rua: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Cuiabá',
      estado: 'MT',
      cep: '78000-000',
    },
    ...over,
  }
}

describe('SEO do cardápio por slug', () => {
  it('nao trata robots.txt como loja', () => {
    expect(isReservedCardapioSlug('robots.txt')).toBe(true)
    expect(isReservedCardapioSlug('sitemap.xml')).toBe(true)
    expect(isReservedCardapioSlug('nexsyn')).toBe(false)
  })

  it('titulo e descricao levam a cidade da loja', () => {
    expect(tituloCardapioSlug(empresa())).toBe(
      'Papaleguas Burgers | Delivery em Cuiabá'
    )
    expect(descricaoCardapioSlug(empresa())).toContain('Cuiabá')
    expect(tituloCardapioSlug(empresa({ endereco: null }))).toBe(
      'Papaleguas Burgers | Cardápio delivery'
    )
  })

  it('JSON-LD e FoodEstablishment com endereco BR', () => {
    const json = jsonLdCardapioSlug(empresa())
    expect(json['@type']).toBe('FoodEstablishment')
    expect(json.areaServed).toBe('Cuiabá')
    expect((json.address as { addressLocality?: string }).addressLocality).toBe(
      'Cuiabá'
    )
  })
})
