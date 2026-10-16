import { describe, expect, it } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'

describe('Produto imagem', () => {
  it('lê image.imageId e mantém o id nas cópias', () => {
    const produto = Produto.fromJSON({
      id: 'p1',
      nome: 'Burger',
      valor: 10,
      ativo: true,
      image: { imageId: 'img-9', imageUrl: 'https://cdn/burger.jpg' },
    })

    expect(produto.getImageId()).toBe('img-9')
    expect(produto.getImagemUrl()).toBe('https://cdn/burger.jpg')

    const fiscal = produto.withDadosFiscais({ ncm: '21069090' })
    const impressoras = produto.withImpressoras([])
    const menus = produto.withMenus([])

    expect(fiscal.getImageId()).toBe('img-9')
    expect(impressoras.getImageId()).toBe('img-9')
    expect(menus.getImageId()).toBe('img-9')
    expect(fiscal.toJSON().imageId).toBe('img-9')
  })

  it('lê imageId solto no payload', () => {
    const produto = Produto.fromJSON({
      id: 'p1',
      nome: 'Burger',
      valor: 10,
      ativo: true,
      imageId: 'img-9',
    })

    expect(produto.getImageId()).toBe('img-9')
    expect(produto.getImagemUrl()).toBeNull()
  })
})
