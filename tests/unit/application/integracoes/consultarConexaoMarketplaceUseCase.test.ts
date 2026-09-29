import { describe, expect, it, vi } from 'vitest'
import { ConsultarConexaoMarketplaceUseCase } from '@/src/application/use-cases/integracoes/ConsultarConexaoMarketplaceUseCase'
import type { IMarketplaceHub } from '@/src/domain/integracoes/IMarketplaceHub'

describe('ConsultarConexaoMarketplaceUseCase', () => {
  it('marca conectada só a loja ativa da empresa no marketplace', async () => {
    const hub: IMarketplaceHub = {
      iniciarConexao: vi.fn(),
      listarLojasAtivas: vi.fn(async () => [
        {
          id: 'mc-1',
          empresaId: 'emp-1',
          marketplace: 'AIQFOME',
          merchantIdOd: '777',
          active: true,
        },
        {
          id: 'mc-2',
          empresaId: 'outra',
          marketplace: 'AIQFOME',
          merchantIdOd: '888',
          active: true,
        },
      ]),
    }
    const useCase = new ConsultarConexaoMarketplaceUseCase(hub)
    await expect(useCase.execute({ empresaId: 'emp-1', marketplace: 'AIQFOME' })).resolves.toEqual({
      conectada: true,
      merchantIdOd: '777',
    })
    await expect(useCase.execute({ empresaId: 'emp-x', marketplace: 'AIQFOME' })).resolves.toEqual({
      conectada: false,
      merchantIdOd: null,
    })
  })
})
