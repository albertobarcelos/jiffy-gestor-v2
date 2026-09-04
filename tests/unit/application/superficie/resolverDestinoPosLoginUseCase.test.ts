import { describe, expect, it } from 'vitest'
import { criarContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { ResolverDestinoPosLoginUseCase } from '@/src/application/use-cases/superficie/ResolverDestinoPosLoginUseCase'

describe('ResolverDestinoPosLoginUseCase', () => {
  const useCase = new ResolverDestinoPosLoginUseCase()

  it('admin sem módulos vai ao dashboard', () => {
    const destino = useCase.execute(criarContextoAcessoSuperficie())
    expect(destino).toEqual({ superficie: 'ERP', pathModulo: '/dashboard' })
  })

  it('operador exclusivo vai ao quadro de pedidos', () => {
    const destino = useCase.execute(
      criarContextoAcessoSuperficie({
        somentePedidos: true,
        modulosAcesso: ['portal-pedidos'],
      })
    )
    expect(destino).toEqual({ superficie: 'PORTAL_PEDIDOS', pathModulo: '/pedidos' })
  })
})
