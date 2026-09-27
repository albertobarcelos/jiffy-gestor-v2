import type { MovimentacaoCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'
import {
  MovimentacaoCaixaEstacaoSchema,
  SangriaCaixaEstacaoSchema,
} from '@/src/application/validators/caixa-estacao/CaixaEstacaoInputSchemas'
import { parseCaixaEstacaoInput } from '@/src/application/validators/caixa-estacao/parseCaixaEstacaoInput'
import { validarSangriaContraSaldo } from '@/src/domain/caixa-estacao/regrasCaixaEstacao'

export type SangriaCaixaEstacaoInput = MovimentacaoCaixaEstacaoInput & {
  saldoDisponivel: number
}

export class RegistrarSangriaCaixaEstacaoUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(estacaoGestorId: string, input: SangriaCaixaEstacaoInput) {
    const id = estacaoGestorId?.trim()
    if (!id) throw new Error('Estação deste computador não está vinculada.')
    const parsed = parseCaixaEstacaoInput(SangriaCaixaEstacaoSchema, input)
    const validacaoSaldo = validarSangriaContraSaldo(parsed.valor, parsed.saldoDisponivel)
    if (!validacaoSaldo.ok) throw new Error(validacaoSaldo.message)
    return this.gateway.registrarSangria(id, {
      valor: parsed.valor,
      descricao: parsed.descricao,
    })
  }
}

export class RegistrarSuprimentoCaixaEstacaoUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(estacaoGestorId: string, input: MovimentacaoCaixaEstacaoInput) {
    const id = estacaoGestorId?.trim()
    if (!id) throw new Error('Estação deste computador não está vinculada.')
    const parsed = parseCaixaEstacaoInput(MovimentacaoCaixaEstacaoSchema, input)
    return this.gateway.registrarSuprimento(id, parsed)
  }
}
