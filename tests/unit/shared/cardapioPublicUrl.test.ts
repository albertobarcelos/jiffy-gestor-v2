import { describe, expect, it, afterEach } from 'vitest'
import {
  getCardapioPublicBaseUrl,
  isCardapioPublicRedirectEnabled,
  mapGestorPublicPathToCardapioUrl,
} from '@/src/shared/utils/cardapioPublicUrl'

describe('cardapioPublicUrl', () => {
  const prev = process.env.CARDAPIO_PUBLIC_URL

  afterEach(() => {
    if (prev === undefined) delete process.env.CARDAPIO_PUBLIC_URL
    else process.env.CARDAPIO_PUBLIC_URL = prev
  })

  it('desliga redirect quando env vazia', () => {
    delete process.env.CARDAPIO_PUBLIC_URL
    expect(isCardapioPublicRedirectEnabled()).toBe(false)
    expect(getCardapioPublicBaseUrl()).toBe('')
    expect(mapGestorPublicPathToCardapioUrl('/delivery/loja')).toBeNull()
  })

  it('mapeia /delivery/{slug} e /cardapio/{slug} para o host do Cardápio', () => {
    process.env.CARDAPIO_PUBLIC_URL = 'http://localhost:5001/'
    expect(isCardapioPublicRedirectEnabled()).toBe(true)
    expect(mapGestorPublicPathToCardapioUrl('/delivery/loja')).toBe(
      'http://localhost:5001/loja'
    )
    expect(mapGestorPublicPathToCardapioUrl('/cardapio/loja', '?x=1')).toBe(
      'http://localhost:5001/loja?x=1'
    )
    expect(mapGestorPublicPathToCardapioUrl('/delivery/loja/carrinho')).toBe(
      'http://localhost:5001/loja/carrinho'
    )
  })

  it('mapeia raiz /delivery e /cardapio', () => {
    process.env.CARDAPIO_PUBLIC_URL = 'https://cardapio.jiffy.run'
    expect(mapGestorPublicPathToCardapioUrl('/delivery')).toBe(
      'https://cardapio.jiffy.run/'
    )
    expect(mapGestorPublicPathToCardapioUrl('/cardapio')).toBe(
      'https://cardapio.jiffy.run/'
    )
  })
})
