import { describe, expect, it } from 'vitest'
import { montarWebAppManifest } from '@/src/infrastructure/pwa/montarWebAppManifest'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { parsePwaIconSize } from '@/src/infrastructure/pwa/pwaIconSizes'

const empresa: EmpresaPublicaDTO = {
  id: '1',
  nomeFantasia: 'Pizzaria da Esquina Gourmet',
  slug: 'pizzaria-esquina',
  telefone: null,
  segmento: null,
  logoUrl: 'https://cdn.example/logo.png',
  bannerUrl: null,
  endereco: null,
}

describe('montarWebAppManifest', () => {
  it('monta start_url e ícones same-origin por slug', () => {
    const m = montarWebAppManifest(empresa)
    expect(m.start_url).toBe('/pizzaria-esquina/')
    expect(m.scope).toBe('/pizzaria-esquina/')
    expect(m.display).toBe('standalone')
    expect(m.short_name.length).toBeLessThanOrEqual(12)
    expect(m.icons.some(i => i.src.includes('/api/public/delivery/pwa-icon/'))).toBe(true)
  })
})

describe('parsePwaIconSize', () => {
  it('aceita tamanhos suportados e cai em 192', () => {
    expect(parsePwaIconSize('512')).toBe(512)
    expect(parsePwaIconSize('180')).toBe(180)
    expect(parsePwaIconSize('99')).toBe(192)
    expect(parsePwaIconSize(null)).toBe(192)
  })
})
