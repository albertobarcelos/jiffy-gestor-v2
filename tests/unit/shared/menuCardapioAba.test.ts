import { describe, expect, it } from 'vitest'
import { menuCardapioPath, resolverMenuCardapioAba } from '@/src/shared/utils/menuCardapioAba'

describe('menuCardapioPath', () => {
  it('produtos é a rota do editor do menu', () => {
    expect(menuCardapioPath('menu-1')).toBe('/menus/menu-1')
    expect(menuCardapioPath('menu-1', 'produtos')).toBe('/menus/menu-1')
  })

  it('categorias fica sob o mesmo menu', () => {
    expect(menuCardapioPath('menu-1', 'categorias')).toBe('/menus/menu-1/categorias')
  })
})

describe('resolverMenuCardapioAba', () => {
  it('reconhece categorias no path do módulo', () => {
    expect(resolverMenuCardapioAba('/menus/abc/categorias')).toBe('categorias')
  })

  it('qualquer outra rota do menu é produtos', () => {
    expect(resolverMenuCardapioAba('/menus/abc')).toBe('produtos')
    expect(resolverMenuCardapioAba('/menus/abc/atualizar-lote')).toBe('produtos')
  })
})
