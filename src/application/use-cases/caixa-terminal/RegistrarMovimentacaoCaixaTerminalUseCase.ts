import type { MovimentacaoCaixaTerminalInput } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import type { IOperacaoCaixaTerminalGateway } from '@/src/application/ports/IOperacaoCaixaTerminalGateway'
import {
  MovimentacaoCaixaTerminalSchema,
  SangriaCaixaTerminalSchema,
} from '@/src/application/validators/caixa-terminal/CaixaTerminalInputSchemas'
import { validarSangriaContraSaldo } from '@/src/domain/caixa-estacao/regrasCaixaEstacao'

export class RegistrarSuprimentoCaixaTerminalUseCase {
  constructor(private readonly gateway: IOperacaoCaixaTerminalGateway) {}

  async execute(terminalId: string, input: MovimentacaoCaixaTerminalInput): Promise<unknown> {
    const id = terminalId?.trim()
    if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')
    const parsed = MovimentacaoCaixaTerminalSchema.parse(input)
    return this.gateway.registrarSuprimento(id, {
      valor: Number(parsed.valor.toFixed(2)),
      descricao: parsed.descricao,
      realizadoPorId: parsed.realizadoPorId,
    })
  }
}

export class RegistrarSangriaCaixaTerminalUseCase {
  constructor(private readonly gateway: IOperacaoCaixaTerminalGateway) {}

  async execute(
    terminalId: string,
    input: MovimentacaoCaixaTerminalInput & { saldoDisponivel: number }
  ): Promise<unknown> {
    const id = terminalId?.trim()
    if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')
    const parsed = SangriaCaixaTerminalSchema.parse(input)
    const saldo = validarSangriaContraSaldo(parsed.valor, parsed.saldoDisponivel)
    if (!saldo.ok) throw new Error(saldo.message)
    return this.gateway.registrarSangria(id, {
      valor: Number(parsed.valor.toFixed(2)),
      descricao: parsed.descricao,
      realizadoPorId: parsed.realizadoPorId,
    })
  }
}
