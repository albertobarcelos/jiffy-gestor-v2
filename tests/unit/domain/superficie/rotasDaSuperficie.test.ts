import { describe, expect, it } from 'vitest'
import {
  isRotaQuadroPedidos,
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
    expect(isRotaQuadroPedidos('/pedidos')).toBe(true)
    expect(isRotaQuadroPedidos('/pedidos/abrir-windows')).toBe(true)
    expect(isRotaQuadroPedidos('/portal-pedidos')).toBe(false)
    expect(isRotaQuadroPedidos('/gestor-pedidos')).toBe(false)
  })

  it('operador de pedidos não entra em /produtos', () => {
    expect(RotasDaSuperficie.pathPermitido(Superficie.GESTOR_PEDIDOS, '/produtos')).toBe(false)
    expect(RotasDaSuperficie.pathPermitido(Superficie.GESTOR_PEDIDOS, '/pedidos')).toBe(true)
    expect(RotasDaSuperficie.pathPermitido(Superficie.GESTOR_PEDIDOS, '/login')).toBe(true)
  })

  it('ERP pode abrir pedidos e o dashboard', () => {
    expect(RotasDaSuperficie.pathPermitido(Superficie.ERP, '/dashboard')).toBe(true)
    expect(RotasDaSuperficie.pathPermitido(Superficie.ERP, '/pedidos')).toBe(true)
  })
})
