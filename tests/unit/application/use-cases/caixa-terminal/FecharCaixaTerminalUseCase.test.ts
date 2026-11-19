import { describe, expect, it, vi } from 'vitest'
import { FecharCaixaTerminalUseCase } from '@/src/application/use-cases/caixa-terminal/FecharCaixaTerminalUseCase'
import type { IOperacaoCaixaTerminalGateway } from '@/src/application/ports/IOperacaoCaixaTerminalGateway'

describe('FecharCaixaTerminalUseCase', () => {
  it('valida input e chama gateway.fechar', async () => {
    const gateway: IOperacaoCaixaTerminalGateway = {
      buscarAtual: vi.fn(),
      buscarPorId: vi.fn(),
      fechar: vi.fn().mockResolvedValue({ operacaoCaixaTerminalId: 'op-1' }),
      registrarSuprimento: vi.fn(),
      registrarSangria: vi.fn(),
      listarMovimentacoes: vi.fn(),
    }

    const useCase = new FecharCaixaTerminalUseCase(gateway)
    const result = await useCase.execute('terminal-1', {
      valorFornecido: 55.559,
      fechadoPorId: 'pdv-1',
    })

    expect(gateway.fechar).toHaveBeenCalledWith('terminal-1', {
      valorFornecido: 55.56,
      fechadoPorId: 'pdv-1',
    })
    expect(result.operacaoCaixaTerminalId).toBe('op-1')
  })

  it('falha sem terminalId', async () => {
    const gateway: IOperacaoCaixaTerminalGateway = {
      buscarAtual: vi.fn(),
      buscarPorId: vi.fn(),
      fechar: vi.fn(),
      registrarSuprimento: vi.fn(),
      registrarSangria: vi.fn(),
      listarMovimentacoes: vi.fn(),
    }
    const useCase = new FecharCaixaTerminalUseCase(gateway)
    await expect(
      useCase.execute('  ', { valorFornecido: 10, fechadoPorId: 'pdv-1' })
    ).rejects.toThrow('Terminal da operação de caixa é obrigatório.')
  })
})
