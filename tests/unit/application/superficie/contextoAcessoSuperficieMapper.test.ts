import { describe, expect, it } from 'vitest'
import { ContextoAcessoSuperficieMapper } from '@/src/application/mappers/superficie/ContextoAcessoSuperficieMapper'
import { isOperadorSomentePedidos } from '@/src/domain/superficie/ContextoAcessoSuperficie'

describe('ContextoAcessoSuperficieMapper', () => {
  it('claims vazios = ERP compatível', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({})
    expect(ctx.usuarioAtivo).toBe(true)
    expect(isOperadorSomentePedidos(ctx)).toBe(false)
  })

  it('superficie PORTAL_PEDIDOS sem módulo erp = só pedidos', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({ superficie: 'PORTAL_PEDIDOS' })
    expect(isOperadorSomentePedidos(ctx)).toBe(true)
  })

  it('lê modulosAcesso do utilizador', () => {
    const ctx = ContextoAcessoSuperficieMapper.fromClaims({
      modulosAcesso: ['portal-pedidos'],
    })
    expect(isOperadorSomentePedidos(ctx)).toBe(true)
  })
})
