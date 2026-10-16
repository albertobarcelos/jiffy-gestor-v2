import { describe, expect, it } from 'vitest'
import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { reescreverCaminhoSlugPublico } from '@/src/infrastructure/seo/reescreverCaminhoSlugPublico'

describe('normalizarSlugPublico', () => {
  it('mantem slug valido de qualquer loja', () => {
    expect(normalizarSlugPublico('pastelariadogordo')).toBe('pastelariadogordo')
    expect(normalizarSlugPublico('gordo-burguer')).toBe('gordo-burguer')
    expect(normalizarSlugPublico('shalon-lanches')).toBe('shalon-lanches')
  })

  it('tira seta, emoji e seletor invisivel colados no fim', () => {
    expect(normalizarSlugPublico('pastelariadogordo➡️')).toBe('pastelariadogordo')
    expect(normalizarSlugPublico('gordo-burguer\u27A1\uFE0F')).toBe('gordo-burguer')
    expect(normalizarSlugPublico('top-burguer\u200B')).toBe('top-burguer')
  })

  it('decodifica uma ou duas vezes o que o WhatsApp manda na URL', () => {
    expect(normalizarSlugPublico('pastelariadogordo%E2%9E%A1%EF%B8%8F')).toBe(
      'pastelariadogordo'
    )
    expect(normalizarSlugPublico('pastelariadogordo%25E2%259E%25A1%25EF%25B8%258F')).toBe(
      'pastelariadogordo'
    )
  })
})

describe('reescreverCaminhoSlugPublico', () => {
  it('limpa home, carrinho e pedido de qualquer loja', () => {
    expect(reescreverCaminhoSlugPublico('/pastelariadogordo➡️')).toBe(
      '/pastelariadogordo'
    )
    expect(reescreverCaminhoSlugPublico('/gordo-burguer%E2%9E%A1%EF%B8%8F/carrinho')).toBe(
      '/gordo-burguer/carrinho'
    )
    expect(reescreverCaminhoSlugPublico('/shalon-lanches\u27A1/pedido/ABC12')).toBe(
      '/shalon-lanches/pedido/ABC12'
    )
  })

  it('limpa o slug do catalogo e dos meios de pagamento', () => {
    expect(
      reescreverCaminhoSlugPublico(
        '/api/public/delivery/catalogo/pastelariadogordo%25E2%259E%25A1%25EF%25B8%258F'
      )
    ).toBe('/api/public/delivery/catalogo/pastelariadogordo')
    expect(
      reescreverCaminhoSlugPublico('/api/public/delivery/meios-pagamento/top-burguer➡️')
    ).toBe('/api/public/delivery/meios-pagamento/top-burguer')
  })

  it('nao mexe em slug limpo nem em rota que nao e loja', () => {
    expect(reescreverCaminhoSlugPublico('/pastelariadogordo')).toBeNull()
    expect(reescreverCaminhoSlugPublico('/gordo-burguer/carrinho')).toBeNull()
    expect(reescreverCaminhoSlugPublico('/instrucoes')).toBeNull()
    expect(reescreverCaminhoSlugPublico('/api/public/delivery/cotacao')).toBeNull()
    expect(reescreverCaminhoSlugPublico('/robots.txt')).toBeNull()
  })
})
