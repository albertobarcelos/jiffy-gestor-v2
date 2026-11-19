import { describe, expect, it, vi } from 'vitest'
import {
  RegistrarSangriaCaixaTerminalUseCase,
  RegistrarSuprimentoCaixaTerminalUseCase,
} from '@/src/application/use-cases/caixa-terminal/RegistrarMovimentacaoCaixaTerminalUseCase'
import type { IOperacaoCaixaTerminalGateway } from '@/src/application/ports/IOperacaoCaixaTerminalGateway'

function makeGateway(partial?: Partial<IOperacaoCaixaTerminalGateway>): IOperacaoCaixaTerminalGateway {
  return {
    buscarAtual: vi.fn(),
    buscarPorId: vi.fn(),
    fechar: vi.fn(),
    registrarSuprimento: vi.fn().mockResolvedValue({ id: 'sup-1' }),
    registrarSangria: vi.fn().mockResolvedValue({ id: 'san-1' }),
    listarMovimentacoes: vi.fn(),
    ...partial,
  }
}

describe('RegistrarMovimentacaoCaixaTerminalUseCase', () => {
  it('registra suprimento', async () => {
    const gateway = makeGateway()
    const useCase = new RegistrarSuprimentoCaixaTerminalUseCase(gateway)
    await useCase.execute('term-1', {
      valor: 50,
      descricao: 'Fundo de troco',
      realizadoPorId: 'pdv-1',
    })
    expect(gateway.registrarSuprimento).toHaveBeenCalledWith('term-1', {
      valor: 50,
      descricao: 'Fundo de troco',
      realizadoPorId: 'pdv-1',
    })
  })

  it('bloqueia sangria acima do saldo', async () => {
    const gateway = makeGateway()
    const useCase = new RegistrarSangriaCaixaTerminalUseCase(gateway)
    await expect(
      useCase.execute('term-1', {
        valor: 80,
        descricao: 'Depósito banco',
        realizadoPorId: 'pdv-1',
        saldoDisponivel: 50,
      })
    ).rejects.toThrow('Valor da sangria não pode ser maior que o saldo em caixa.')
  })
})
