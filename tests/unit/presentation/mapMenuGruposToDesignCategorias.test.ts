import { describe, expect, it } from 'vitest'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'
import { mapMenuGruposToDesignCategorias } from '@/src/presentation/components/features/delivery-publico/shared/utils/mapDesignCategoriaGrupos'

function grupo(partial: Partial<MenuGrupoProduto> & { nome: string; ordem: number }): MenuGrupoProduto {
  return {
    id: partial.id ?? `snap-${partial.nome}`,
    nome: partial.nome,
    ordem: partial.ordem,
    menuId: partial.menuId ?? 'menu-1',
    grupoBase: partial.grupoBase ?? {
      id: `base-${partial.nome}`,
      nome: partial.nome,
      corHex: '#AABBCC',
      iconName: 'local_pizza',
    },
    image: partial.image,
    dataCriacao: partial.dataCriacao ?? '2026-01-01',
    dataAtualizacao: partial.dataAtualizacao ?? '2026-01-01',
  }
}

describe('mapMenuGruposToDesignCategorias', () => {
  it('ordena pelo snapshot do menu e usa o id do grupo base', () => {
    const mapped = mapMenuGruposToDesignCategorias([
      grupo({ nome: 'Lanches', ordem: 2 }),
      grupo({
        nome: 'Pizzas',
        ordem: 1,
        image: { imageId: 'img-pizzas', imageUrl: 'https://cdn/pizzas.jpg' },
      }),
    ])

    expect(mapped.map(item => item.nome)).toEqual(['Pizzas', 'Lanches'])
    expect(mapped[0].id).toBe('base-Pizzas')
    expect(mapped[0].imagemUrl).toBe('https://cdn/pizzas.jpg')
  })

  it('prefere a imagem do snapshot à do cadastro base', () => {
    const mapped = mapMenuGruposToDesignCategorias([
      grupo({
        nome: 'Açaí',
        ordem: 1,
        grupoBase: {
          id: 'base-acai',
          nome: 'Açaí',
          imagemUrl: 'https://cdn/base.jpg',
        },
        image: { imageId: 'img-acai', imageUrl: '  https://cdn/menu.jpg  ' },
      }),
    ])

    expect(mapped[0].imagemUrl).toBe('https://cdn/menu.jpg')
    expect(mapped[0].id).toBe('base-acai')
  })
})
