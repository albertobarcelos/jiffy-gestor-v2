import { describe, expect, it } from 'vitest'
import {
  lerMenuIdDeParametroEmpresa,
  montarParametroEmpresaComMenuDelivery,
} from '@/src/shared/utils/parametroEmpresaMenus'

describe('parametroEmpresaMenus', () => {
  it('lê menuDeliveryId válido', () => {
    expect(
      lerMenuIdDeParametroEmpresa({ menuDeliveryId: '  menu-1  ' }, 'menuDeliveryId')
    ).toBe('menu-1')
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
})
