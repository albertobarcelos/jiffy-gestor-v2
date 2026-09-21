import { describe, expect, it, afterEach } from 'vitest'
import {
  textoWhatsappCardapioPublico,
  urlCardapioPublicoParaCompartilhar,
} from '@/src/shared/utils/compartilharCardapioPublico'
import { montarLinkWhatsappCompartilhar } from '@/src/shared/utils/whatsappLink'

describe('compartilharCardapioPublico', () => {
  const prevPublic = process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
  const prevServer = process.env.CARDAPIO_PUBLIC_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    else process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = prevPublic
    if (prevServer === undefined) delete process.env.CARDAPIO_PUBLIC_URL
    else process.env.CARDAPIO_PUBLIC_URL = prevServer
  })

  it('monta URL absoluta da loja com host público', () => {
    delete process.env.CARDAPIO_PUBLIC_URL
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL = 'https://cardapio.jiffy.run/'
    expect(urlCardapioPublicoParaCompartilhar('pastelaria-do-gordo')).toBe(
      'https://cardapio.jiffy.run/pastelaria-do-gordo'
    )
  })

  it('usa origin de fallback quando o host público não está configurado', () => {
    delete process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL
    delete process.env.CARDAPIO_PUBLIC_URL
    expect(
      urlCardapioPublicoParaCompartilhar('loja', 'https://app.jiffy.run')
    ).toBe('https://app.jiffy.run/delivery/loja')
  })

  it('monta texto do WhatsApp com o nome da loja', () => {
    expect(
      textoWhatsappCardapioPublico(
        'Pastelaria do Gordo',
        'https://cardapio.jiffy.run/pastelaria'
      )
    ).toBe(
      'Olá! Peça pelo cardápio da Pastelaria do Gordo:\nhttps://cardapio.jiffy.run/pastelaria'
    )
  })

  it('monta texto genérico sem nome da loja', () => {
    expect(textoWhatsappCardapioPublico('  ', 'https://cardapio.jiffy.run/x')).toBe(
      'Olá! Peça pelo nosso cardápio:\nhttps://cardapio.jiffy.run/x'
    )
  })

  it('abre WhatsApp sem telefone, só com o texto', () => {
    const mensagem = 'Olá! Peça pelo nosso cardápio:\nhttps://cardapio.jiffy.run/x'
    expect(montarLinkWhatsappCompartilhar(mensagem)).toBe(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`
    )
  })
})
