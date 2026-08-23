import { describe, expect, it } from 'vitest'
import {
  isRotaPortalPedidos,
  isRotaPublicaAuth,
  isRotaSessaoHub,
  normalizarPathModulo,
  RotasDaSuperficie,
} from '@/src/domain/superficie/policies/RotasDaSuperficie'
import { Superficie } from '@/src/domain/superficie/Superficie'

describe('RotasDaSuperficie', () => {
  it('normaliza query e barra final', () => {
    expect(normalizarPathModulo('/pedidos/?x=1')).toBe('/pedidos')
  })

  it('classifica login, hub e pedidos', () => {
    expect(isRotaPublicaAuth('/login')).toBe(true)
    expect(isRotaSessaoHub('/minhas-empresas')).toBe(true)
    expect(isRotaPortalPedidos('/pedidos')).toBe(true)
    expect(isRotaPortalPedidos('/pedidos/abrir-windows')).toBe(true)
    expect(isRotaPortalPedidos('/portal-pedidos')).toBe(false)
    expect(isRotaPortalPedidos('/gestor-pedidos')).toBe(false)
  })

  it('operador de pedidos não entra em /produtos', () => {
    expect(RotasDaSuperficie.pathPermitido(Superficie.PORTAL_PEDIDOS, '/produtos')).toBe(false)
    expect(RotasDaSuperficie.pathPermitido(Superficie.PORTAL_PEDIDOS, '/pedidos')).toBe(true)
    expect(RotasDaSuperficie.pathPermitido(Superficie.PORTAL_PEDIDOS, '/login')).toBe(true)
  })

  it('ERP pode abrir pedidos e o dashboard', () => {
    expect(RotasDaSuperficie.pathPermitido(Superficie.ERP, '/dashboard')).toBe(true)
    expect(RotasDaSuperficie.pathPermitido(Superficie.ERP, '/pedidos')).toBe(true)
  })
})
