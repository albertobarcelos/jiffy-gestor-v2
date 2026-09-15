/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  gravarMenuCardapioSessao,
  limparMenusCardapioSessao,
  resolverMenuCardapioInicial,
} from '@/src/shared/utils/menuCardapioSessao'

const principal = { id: 'menu-principal', tipo: 'principal' }
const happyHour = { id: 'menu-hh', tipo: 'custom' }

describe('resolverMenuCardapioInicial', () => {
  afterEach(() => {
    limparMenusCardapioSessao()
  })

  it('entra no Principal quando não há escolha gravada', () => {
    expect(
      resolverMenuCardapioInicial({
        empresaId: 'emp-1',
        menus: [happyHour, principal],
      })
    ).toBe('menu-principal')
  })

  it('reusa a escolha da sessão enquanto o menu existir', () => {
    gravarMenuCardapioSessao('emp-1', 'menu-hh')
    expect(
      resolverMenuCardapioInicial({
        empresaId: 'emp-1',
        menus: [principal, happyHour],
      })
    ).toBe('menu-hh')
  })

  it('volta ao Principal se o menu gravado foi apagado', () => {
    gravarMenuCardapioSessao('emp-1', 'menu-sumiu')
    expect(
      resolverMenuCardapioInicial({
        empresaId: 'emp-1',
        menus: [principal, happyHour],
      })
    ).toBe('menu-principal')
  })
})
