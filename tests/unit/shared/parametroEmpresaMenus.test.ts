import { describe, expect, it } from 'vitest'
import {
  lerMenuIdDeParametroEmpresa,
  montarParametroEmpresaComMenuDelivery,
  patchMenuIdEmParametroEmpresa,
} from '@/src/shared/utils/parametroEmpresaMenus'

describe('parametroEmpresaMenus', () => {
  it('lê menuDeliveryId válido', () => {
    expect(
      lerMenuIdDeParametroEmpresa({ menuDeliveryId: '  menu-1  ' }, 'menuDeliveryId')
    ).toBe('menu-1')
  })

  it('lê menuVendaGestorId e alias menuVendasGestorId', () => {
    expect(
      lerMenuIdDeParametroEmpresa({ menuVendaGestorId: 'menu-gestor' }, 'menuVendaGestorId')
    ).toBe('menu-gestor')
    expect(
      lerMenuIdDeParametroEmpresa({ menuVendasGestorId: 'menu-alias' }, 'menuVendaGestorId')
    ).toBe('menu-alias')
  })

  it('trata ausência, vazio e tipo inválido como null', () => {
    expect(lerMenuIdDeParametroEmpresa({}, 'menuDeliveryId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa({ menuDeliveryId: '' }, 'menuDeliveryId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa({ menuDeliveryId: 1 }, 'menuDeliveryId')).toBeNull()
    expect(lerMenuIdDeParametroEmpresa(null, 'menuDeliveryId')).toBeNull()
  })

  it('preserva demais parâmetros ao gravar o menu de delivery', () => {
    expect(
      montarParametroEmpresaComMenuDelivery({ timezone: 'America/Sao_Paulo' }, 'menu-9')
    ).toEqual({
      timezone: 'America/Sao_Paulo',
      menuDeliveryId: 'menu-9',
    })
    expect(montarParametroEmpresaComMenuDelivery({ timezone: 'America/Manaus' }, null)).toEqual({
      timezone: 'America/Manaus',
      menuDeliveryId: null,
    })
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
