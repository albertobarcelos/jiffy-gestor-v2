import { describe, expect, it, afterEach } from 'vitest'
import {
  buildCardapioLojaUrl,
  getCardapioPublicBaseUrl,
  getCardapioSlugInputPrefix,
  isCardapioPublicRedirectEnabled,
  mapGestorPublicPathToCardapioUrl,
} from '@/src/shared/utils/cardapioPublicUrl'

describe('cardapioPublicUrl', () => {
  const prevPublic = process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
  const prevServer = process.env.CARDAPIO_PUBLIC_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    else process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = prevPublic
    if (prevServer === undefined) delete process.env.CARDAPIO_PUBLIC_URL
    else process.env.CARDAPIO_PUBLIC_URL = prevServer
  })

  function clearEnv() {
    delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    delete process.env.CARDAPIO_PUBLIC_URL
  }

  it('desliga redirect quando env vazia', () => {
    clearEnv()
    expect(isCardapioPublicRedirectEnabled()).toBe(false)
    expect(getCardapioPublicBaseUrl()).toBe('')
    expect(mapGestorPublicPathToCardapioUrl('/delivery/loja')).toBeNull()
    expect(buildCardapioLojaUrl('loja', 'https://gestor.local')).toBe(
      'https://gestor.local/delivery/loja'
    )
    expect(getCardapioSlugInputPrefix()).toBe('/delivery/')
  })

  it('usa NEXT_PUBLIC_CARDAPIO_PUBLIC_URL no hub e no redirect', () => {
    clearEnv()
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = 'http://localhost:5001/'
    expect(isCardapioPublicRedirectEnabled()).toBe(true)
    expect(buildCardapioLojaUrl('loja')).toBe('http://localhost:5001/loja')
    expect(getCardapioSlugInputPrefix()).toBe('localhost:5001/')
    expect(mapGestorPublicPathToCardapioUrl('/delivery/loja/carrinho')).toBe(
      'http://localhost:5001/loja/carrinho'
    )
  })

  it('aceita CARDAPIO_PUBLIC_URL como alias server-side', () => {
    clearEnv()
    process.env.CARDAPIO_PUBLIC_URL = 'https://cardapio.jiffy.run'
    expect(mapGestorPublicPathToCardapioUrl('/cardapio/loja', '?x=1')).toBe(
      'https://cardapio.jiffy.run/loja?x=1'
    )
    expect(mapGestorPublicPathToCardapioUrl('/delivery')).toBe(
      'https://cardapio.jiffy.run/'
    )
  })

  it('prefer NEXT_PUBLIC sobre CARDAPIO_PUBLIC_URL', () => {
    clearEnv()
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = 'http://localhost:5001'
    process.env.CARDAPIO_PUBLIC_URL = 'https://cardapio.jiffy.run'
    expect(getCardapioPublicBaseUrl()).toBe('http://localhost:5001')
  })
})
