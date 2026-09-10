import { describe, expect, it, afterEach } from 'vitest'
import { buildCardapioCatalogoPublicUrl } from '@/src/infrastructure/api/empresaDeliveryMidiaApi'

describe('buildCardapioCatalogoPublicUrl', () => {
  const prevPublic = process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
  const prevServer = process.env.CARDAPIO_PUBLIC_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    else process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = prevPublic
    if (prevServer === undefined) delete process.env.CARDAPIO_PUBLIC_URL
    else process.env.CARDAPIO_PUBLIC_URL = prevServer
  })

  it('exige NEXT_PUBLIC_CARDAPIO_PUBLIC_URL', () => {
    delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    delete process.env.CARDAPIO_PUBLIC_URL
    expect(() => buildCardapioCatalogoPublicUrl('loja')).toThrow(/CARDAPIO_PUBLIC_URL/)
  })

  it('monta URL do BFF público do Cardápio', () => {
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = 'http://localhost:5001/'
    expect(buildCardapioCatalogoPublicUrl('minha-loja')).toBe(
      'http://localhost:5001/api/public/delivery/catalogo/minha-loja?offset=0&limit=1'
    )
  })
})
