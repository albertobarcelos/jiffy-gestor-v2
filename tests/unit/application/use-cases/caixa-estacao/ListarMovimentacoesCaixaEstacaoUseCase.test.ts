import { describe, expect, it, vi } from 'vitest'
import { ListarMovimentacoesCaixaEstacaoUseCase } from '@/src/application/use-cases/caixa-estacao/ListarMovimentacoesCaixaEstacaoUseCase'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'

describe('ListarMovimentacoesCaixaEstacaoUseCase', () => {
  it('retorna lista ordenada da mais recente para a mais antiga', async () => {
    const gateway: Pick<IOperacaoCaixaEstacaoGateway, 'listarMovimentacoes'> = {
      listarMovimentacoes: vi.fn().mockResolvedValue([
        {
          id: '1',
          valor: 10,
          descricao: 'Antiga',
          operacaoCaixaId: 'op',
          realizadoPorAtor: { id: 'u', type: '', sourceReference: '', nome: 'A' },
          dataCriacao: '2026-09-22T10:00:00.000Z',
        },
        {
          id: '2',
          valor: 20,
          descricao: 'Recente',
          operacaoCaixaId: 'op',
          realizadoPorAtor: { id: 'u', type: '', sourceReference: '', nome: 'B' },
          dataCriacao: '2026-09-22T12:00:00.000Z',
        },
      ]),
    }

    const useCase = new ListarMovimentacoesCaixaEstacaoUseCase(
      gateway as IOperacaoCaixaEstacaoGateway
    )
    const resultado = await useCase.execute('estacao-1', 'suprimentos')

    expect(resultado).toHaveLength(2)
    expect(resultado[0]?.id).toBe('2')
    expect(resultado[1]?.id).toBe('1')
  })

  it('retorna vazio sem estacaoId', async () => {
    const gateway: Pick<IOperacaoCaixaEstacaoGateway, 'listarMovimentacoes'> = {
      listarMovimentacoes: vi.fn(),
    }
    const useCase = new ListarMovimentacoesCaixaEstacaoUseCase(
      gateway as IOperacaoCaixaEstacaoGateway
    )
    await expect(useCase.execute('  ', 'sangrias')).resolves.toEqual([])
    expect(gateway.listarMovimentacoes).not.toHaveBeenCalled()
  })
})
