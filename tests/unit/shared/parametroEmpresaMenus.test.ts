import { describe, expect, it } from 'vitest'
import {
  lerMenuIdDeParametroEmpresa,
  patchMenuIdEmParametroEmpresa,
} from '@/src/shared/utils/parametroEmpresaMenus'

describe('parametroEmpresaMenus', () => {
  it('lê menuVendaGestorId e alias menuVendasGestorId', () => {
    expect(
      lerMenuIdDeParametroEmpresa({ menuVendaGestorId: 'menu-gestor' }, 'menuVendaGestorId')
    ).toBe('menu-gestor')
    expect(
      lerMenuIdDeParametroEmpresa({ menuVendasGestorId: 'menu-alias' }, 'menuVendaGestorId')
    ).toBe('menu-alias')
  })

  it('trata ausência, vazio e tipo inválido como null', () => {
    expect(lerMenuIdDeParametroEmpresa({}, 'menuVendaGestorId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa({ menuVendaGestorId: '' }, 'menuVendaGestorId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa({ menuVendaGestorId: 1 }, 'menuVendaGestorId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa(null, 'menuVendaGestorId')).toBeNull()
  })

  it('grava menuVendaGestorId e remove alias legado', () => {
    expect(
      patchMenuIdEmParametroEmpresa(
        { timezone: 'America/Sao_Paulo', menuVendasGestorId: 'old' },
        'menuVendaGestorId',
        'menu-novo'
      )
    ).toEqual({
      timezone: 'America/Sao_Paulo',
      menuVendaGestorId: 'menu-novo',
    })
  })
})
