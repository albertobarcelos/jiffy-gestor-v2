import { describe, expect, it, vi } from 'vitest'
import { ConectarMarketplaceUseCase } from '@/src/application/use-cases/integracoes/ConectarMarketplaceUseCase'
import type { IMarketplaceHub } from '@/src/domain/integracoes/IMarketplaceHub'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'

describe('ConectarMarketplaceUseCase', () => {
  it('usa a mesma porta do hub para qualquer marketplace do catálogo', async () => {
    const hub: IMarketplaceHub = {
      iniciarConexao: vi.fn(async solicitacao => {
        expect(solicitacao.empresaId).toBe('emp-1')
        expect(solicitacao.marketplace.codigo).toBe('AIQFOME')
        expect(solicitacao.merchantIdOd.valor).toBe('9988')
        return { authorizationUrl: 'https://id.exemplo.com/login?state=abc' }
      }),
      listarLojasAtivas: vi.fn(),
    }
    const useCase = new ConectarMarketplaceUseCase(hub)
    const resultado = await useCase.execute({
      empresaId: 'emp-1',
      marketplace: 'AIQFOME',
      merchantIdOd: '9988',
    })
    expect(resultado.authorizationUrl).toContain('state=abc')
    expect(hub.iniciarConexao).toHaveBeenCalledTimes(1)
  })

  it('não chama o hub quando o pedido é inválido', async () => {
    const hub: IMarketplaceHub = { iniciarConexao: vi.fn(), listarLojasAtivas: vi.fn() }
    const useCase = new ConectarMarketplaceUseCase(hub)
    await expect(
      useCase.execute({ empresaId: 'emp-1', marketplace: 'IFOOD', merchantIdOd: '1' })
    ).rejects.toBeInstanceOf(IntegracaoMarketplaceError)
    expect(hub.iniciarConexao).not.toHaveBeenCalled()
  })
})
