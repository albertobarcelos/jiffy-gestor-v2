import { describe, expect, it } from 'vitest'
import { Complemento } from '@/src/domain/entities/Complemento'

describe('Complemento.parseAtivo', () => {
  it('true booleano → ativo', () => expect(Complemento.parseAtivo(true)).toBe(true))
  it('false booleano → inativo', () => expect(Complemento.parseAtivo(false)).toBe(false))
  it('string "true" → ativo', () => expect(Complemento.parseAtivo('true')).toBe(true))
  it('string "false" → inativo', () => expect(Complemento.parseAtivo('false')).toBe(false))
  it('número 1 → ativo', () => expect(Complemento.parseAtivo(1)).toBe(true))
  it('número 0 → inativo', () => expect(Complemento.parseAtivo(0)).toBe(false))
  it('string "1" → ativo', () => expect(Complemento.parseAtivo('1')).toBe(true))
  it('string "0" → inativo', () => expect(Complemento.parseAtivo('0')).toBe(false))
  it('null → default ativo', () => expect(Complemento.parseAtivo(null)).toBe(true))
  it('undefined → default ativo', () => expect(Complemento.parseAtivo(undefined)).toBe(true))
})

describe('Complemento.fromJSON', () => {
  const base = { id: '1', nome: 'Queijo' }

  it('campo ativo ausente → ativo', () => {
    expect(Complemento.fromJSON(base).isAtivo()).toBe(true)
  })

  it('ativo: false → inativo', () => {
    expect(Complemento.fromJSON({ ...base, ativo: false }).isAtivo()).toBe(false)
  })

  it('ativo: 0 (inteiro API) → inativo', () => {
    expect(Complemento.fromJSON({ ...base, ativo: 0 }).isAtivo()).toBe(false)
  })

  it('ativo: 1 (inteiro API) → ativo', () => {
    expect(Complemento.fromJSON({ ...base, ativo: 1 }).isAtivo()).toBe(true)
  })

  it('ativo: "1" → ativo', () => {
    expect(Complemento.fromJSON({ ...base, ativo: '1' }).isAtivo()).toBe(true)
  })

  it('ativo: "0" → inativo', () => {
    expect(Complemento.fromJSON({ ...base, ativo: '0' }).isAtivo()).toBe(false)
  })

  it('lê imagemUrl solto', () => {
    expect(
      Complemento.fromJSON({ ...base, imagemUrl: ' https://cdn/comp.jpg ' }).getImagemUrl()
    ).toBe('https://cdn/comp.jpg')
  })

  it('lê image.imageUrl do backend de mídia', () => {
    expect(
      Complemento.fromJSON({
        ...base,
        image: { imageId: 'img-1', imageUrl: 'https://cdn/nested.jpg' },
      }).getImagemUrl()
    ).toBe('https://cdn/nested.jpg')
  })

  it('lê image.imageUrl dentro de data', () => {
    expect(
      Complemento.fromJSON({
        data: {
          ...base,
          image: { imageUrl: 'https://cdn/wrap.jpg' },
        },
      }).getImagemUrl()
    ).toBe('https://cdn/wrap.jpg')
  })
})

describe('Complemento.withImagemUrl', () => {
  const base = Complemento.create('1', 'Queijo')

  it('grava URL persistida sem alterar os demais campos', () => {
    const next = base.withImagemUrl(' https://cdn/q.jpg ')
    expect(next).not.toBe(base)
    expect(next.getId()).toBe('1')
    expect(next.getNome()).toBe('Queijo')
    expect(next.getImagemUrl()).toBe('https://cdn/q.jpg')
  })

  it('mesma URL → mesma instância', () => {
    const withUrl = base.withImagemUrl('https://cdn/q.jpg')
    expect(withUrl.withImagemUrl('https://cdn/q.jpg')).toBe(withUrl)
  })

  it('null remove a foto', () => {
    expect(base.withImagemUrl('https://cdn/q.jpg').withImagemUrl(null).getImagemUrl()).toBeNull()
  })
})
