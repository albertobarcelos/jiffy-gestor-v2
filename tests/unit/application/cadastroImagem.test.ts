import { describe, expect, it } from 'vitest'
import type { ICadastroImagemMedia } from '@/src/application/ports/ICadastroImagemMedia'
import {
  aplicarImagensEmLista,
  hidratarImagemCadastro,
  urlImagemHttp,
} from '@/src/application/services/cadastroImagem'

describe('urlImagemHttp', () => {
  it('aceita http(s)', () => {
    expect(urlImagemHttp(' https://cdn/a.jpg ')).toBe('https://cdn/a.jpg')
  })

  it('rejeita blob e data', () => {
    expect(urlImagemHttp('blob:http://localhost/1')).toBeNull()
    expect(urlImagemHttp('data:image/png;base64,abc')).toBeNull()
  })
})

describe('hidratarImagemCadastro', () => {
  const store = new Map<string, string>()
  const media: ICadastroImagemMedia = {
    resolverLote: async () => ({}),
    resolverUma: async () => null,
    resolverDoCadastro: async () => ({}),
    enviar: async () => null,
    lembrar: (id, url) => {
      const value = urlImagemHttp(url)
      if (value) store.set(id, value)
      return store.get(id) ?? null
    },
    conhecida: id => store.get(id) ?? null,
  }

  it('mantém URL da entidade e grava na porta', () => {
    const item = { id: '1', url: 'https://cdn/a.jpg' }
    const result = hidratarImagemCadastro(
      media,
      item,
      i => i.id,
      i => i.url,
      (i, url) => ({ ...i, url: url ?? '' })
    )
    expect(result).toBe(item)
    expect(media.conhecida('1')).toBe('https://cdn/a.jpg')
  })

  it('aplica URL conhecida quando a entidade veio vazia', () => {
    store.set('2', 'https://cdn/known.jpg')
    const item = { id: '2', url: null as string | null }
    const result = hidratarImagemCadastro(
      media,
      item,
      i => i.id,
      i => i.url,
      (i, url) => ({ ...i, url })
    )
    expect(result.url).toBe('https://cdn/known.jpg')
  })
})

describe('aplicarImagensEmLista', () => {
  it('só reescreve itens com URL nova', () => {
    const items = [
      { id: 'a', url: null as string | null },
      { id: 'b', url: null as string | null },
    ]
    const next = aplicarImagensEmLista(
      items,
      { a: 'https://cdn/a.jpg', b: null },
      i => i.id,
      (i, url) => ({ ...i, url })
    )
    expect(next[0].url).toBe('https://cdn/a.jpg')
    expect(next[1]).toBe(items[1])
  })
})
