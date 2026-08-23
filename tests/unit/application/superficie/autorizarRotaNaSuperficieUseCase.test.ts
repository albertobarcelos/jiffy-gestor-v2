import { describe, expect, it } from 'vitest'
import { criarContextoAcessoSuperficie } from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { AutorizarRotaNaSuperficieUseCase } from '@/src/application/use-cases/superficie/AutorizarRotaNaSuperficieUseCase'

describe('AutorizarRotaNaSuperficieUseCase', () => {
  const useCase = new AutorizarRotaNaSuperficieUseCase()

  it('bloqueia /produtos do operador exclusivo e aponta ao portal', () => {
    const ctx = criarContextoAcessoSuperficie({
      somentePortalPedidos: true,
      modulosAcesso: ['portal-pedidos'],
    })
    const r = useCase.execute({ pathModulo: '/gestao/x/produtos', contexto: ctx })
    // path ainda não stripa slug — o caller (presentation) envia o módulo
    const soModulo = useCase.execute({ pathModulo: '/produtos', contexto: ctx })
    expect(soModulo.permitido).toBe(false)
    expect(soModulo.destinoSeNegado).toBe('/pedidos')
    expect(r.permitido).toBe(false)
  })

  it('permite /pedidos ao operador exclusivo', () => {
    const ctx = criarContextoAcessoSuperficie({ somentePortalPedidos: true })
    const r = useCase.execute({ pathModulo: '/pedidos', contexto: ctx })
    expect(r.permitido).toBe(true)
  })

  it('admin em /dashboard permanece permitido', () => {
    const r = useCase.execute({
      pathModulo: '/dashboard',
      contexto: criarContextoAcessoSuperficie(),
    })
    expect(r.permitido).toBe(true)
    expect(r.superficie).toBe('ERP')
  })

  it('login e hub são sempre permitidos', () => {
    const ctx = criarContextoAcessoSuperficie({ somentePortalPedidos: true })
    expect(useCase.execute({ pathModulo: '/login', contexto: ctx }).permitido).toBe(true)
    expect(useCase.execute({ pathModulo: '/minhas-empresas', contexto: ctx }).permitido).toBe(true)
  })
})
