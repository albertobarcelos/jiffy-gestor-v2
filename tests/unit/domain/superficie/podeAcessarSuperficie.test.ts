import { describe, expect, it } from 'vitest'
import { criarContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { PodeAcessarSuperficie } from '@/src/domain/superficie/policies/PodeAcessarSuperficie'
import { Superficie } from '@/src/domain/superficie/Superficie'

describe('PodeAcessarSuperficie', () => {
  it('utilizador sem sinais continua no ERP e pode pré-visualizar o portal', () => {
    const ctx = criarContextoAcessoSuperficie()
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(true)
    expect(PodeAcessarSuperficie.check(Superficie.PORTAL_PEDIDOS, ctx)).toBe(true)
  })

  it('operador exclusivo não entra no ERP', () => {
    const ctx = criarContextoAcessoSuperficie({
      somentePortalPedidos: true,
      modulosAcesso: ['portal-pedidos'],
    })
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(false)
    expect(PodeAcessarSuperficie.check(Superficie.PORTAL_PEDIDOS, ctx)).toBe(true)
  })

  it('módulo portal-pedidos sem erp implica só portal', () => {
    const ctx = criarContextoAcessoSuperficie({ modulosAcesso: ['portal-pedidos'] })
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(false)
  })

  it('portal + erp permite as duas superfícies', () => {
    const ctx = criarContextoAcessoSuperficie({
      modulosAcesso: ['portal-pedidos', 'erp'],
    })
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(true)
    expect(PodeAcessarSuperficie.check(Superficie.PORTAL_PEDIDOS, ctx)).toBe(true)
  })

  it('claim portalPedidos=false sem módulo bloqueia o portal', () => {
    const ctx = criarContextoAcessoSuperficie({ claimPortalPedidos: false })
    expect(PodeAcessarSuperficie.check(Superficie.PORTAL_PEDIDOS, ctx)).toBe(false)
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(true)
  })

  it('utilizador inativo não acede a nenhuma superfície', () => {
    const ctx = criarContextoAcessoSuperficie({ usuarioAtivo: false })
    expect(PodeAcessarSuperficie.check(Superficie.ERP, ctx)).toBe(false)
    expect(PodeAcessarSuperficie.check(Superficie.PORTAL_PEDIDOS, ctx)).toBe(false)
  })
})
