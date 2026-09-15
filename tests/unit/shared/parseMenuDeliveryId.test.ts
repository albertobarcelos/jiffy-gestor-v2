import { describe, expect, it } from 'vitest'
import {
  lerMenuDeliveryIdDeParametroDelivery,
  parseMenuDeliveryId,
} from '@/src/shared/utils/parseMenuDeliveryId'

describe('parseMenuDeliveryId', () => {
  it('lê menuDeliveryId de parametroDelivery', () => {
    expect(
      lerMenuDeliveryIdDeParametroDelivery({ menuDeliveryId: '  menu-1  ' })
    ).toBe('menu-1')
    expect(lerMenuDeliveryIdDeParametroDelivery({ menu_delivery_id: 'menu-2' })).toBe('menu-2')
  })

  it('prioriza parametroDelivery sobre parametroEmpresa legado', () => {
    expect(
      parseMenuDeliveryId({
        parametroDelivery: { menuDeliveryId: 'menu-delivery' },
        parametroEmpresa: { menuDeliveryId: 'menu-legado' },
      })
    ).toBe('menu-delivery')
  })

  it('usa fallback legado em parametroEmpresa', () => {
    expect(parseMenuDeliveryId({ parametroEmpresa: { menuDeliveryId: 'menu-legado' } })).toBe(
      'menu-legado'
    )
  })

  it('trata ausência, vazio e tipo inválido como null', () => {
    expect(lerMenuDeliveryIdDeParametroDelivery({})).toBeNull()
    expect(lerMenuDeliveryIdDeParametroDelivery({ menuDeliveryId: '' })).toBeNull()
    expect(lerMenuDeliveryIdDeParametroDelivery({ menuDeliveryId: 1 })).toBeNull()
    expect(lerMenuDeliveryIdDeParametroDelivery(null)).toBeNull()
    expect(parseMenuDeliveryId({})).toBeNull()
  })
})
