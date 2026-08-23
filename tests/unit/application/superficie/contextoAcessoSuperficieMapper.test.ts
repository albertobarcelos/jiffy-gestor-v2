import { describe, expect, it } from 'vitest'
import { ContextoAcessoSuperficieMapper } from '@/src/application/mappers/ContextoAcessoSuperficieMapper'
import { isOperadorSomentePortal } from '@/src/domain/superficie/ContextoAcessoSuperficie'

describe('ContextoAcessoSuperficieMapper', () => {
  it('claims vazios = ERP compatível', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({})
    expect(ctx.usuarioAtivo).toBe(true)
    expect(isOperadorSomentePortal(ctx)).toBe(false)
  })

  it('superficie PORTAL_PEDIDOS sem módulo erp = só portal', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({ superficie: 'PORTAL_PEDIDOS' })
    expect(isOperadorSomentePortal(ctx)).toBe(true)
  })

  it('lê modulosAcesso do utilizador', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({
      modulosAcesso: ['portal-pedidos'],
    })
    expect(isOperadorSomentePortal(ctx)).toBe(true)
  })
})
