import { describe, it, expect, vi } from 'vitest'
import { InutilizarNumeracaoUseCase } from '@/src/application/use-cases/painel-contador/InutilizarNumeracaoUseCase'
import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'

describe('InutilizarNumeracaoUseCase', () => {
  it('rejeita justificativa curta', async () => {
    const repository = {
      inutilizarNumeracao: vi.fn(),
    } as unknown as IFiscalPainelRepository

    const useCase = new InutilizarNumeracaoUseCase(repository)

    await expect(
      useCase.execute({
        uf: 'SP',
        ambiente: 'PRODUCAO',
        modelo: 65,
        serie: 1,
        numeroInicial: 10,
        numeroFinal: 10,
        justificativa: 'curta',
      })
    ).rejects.toThrow()

    expect(repository.inutilizarNumeracao).not.toHaveBeenCalled()
  })

  it('delega inutilização válida ao repositório', async () => {
    const repository = {
      inutilizarNumeracao: vi.fn().mockResolvedValue(undefined),
    } as unknown as IFiscalPainelRepository

    const useCase = new InutilizarNumeracaoUseCase(repository)
    const input = {
      uf: 'SP',
      ambiente: 'PRODUCAO' as const,
      modelo: 65 as const,
      serie: 1,
      numeroInicial: 10,
      numeroFinal: 10,
      justificativa: 'Inutilização de numeração por lacuna detectada.',
    }

    await useCase.execute(input)
    expect(repository.inutilizarNumeracao).toHaveBeenCalledWith(input)
  })
})
