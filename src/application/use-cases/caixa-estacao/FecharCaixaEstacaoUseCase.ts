import type { FecharCaixaEstacaoInput } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import type {
  FecharCaixaEstacaoGatewayResult,
  IOperacaoCaixaEstacaoGateway,
} from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'
import { FecharCaixaEstacaoSchema } from '@/src/application/validators/caixa-estacao/CaixaEstacaoInputSchemas'
import { parseCaixaEstacaoInput } from '@/src/application/validators/caixa-estacao/parseCaixaEstacaoInput'

export class FecharCaixaEstacaoUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(
    estacaoGestorId: string,
    input: FecharCaixaEstacaoInput
  ): Promise<FecharCaixaEstacaoGatewayResult> {
    const id = estacaoGestorId?.trim()
    if (!id) throw new Error('Estação deste computador não está vinculada.')
    const parsed = parseCaixaEstacaoInput(FecharCaixaEstacaoSchema, input)
    return this.gateway.fechar(id, {
      valorFornecido: Number(parsed.valorFornecido.toFixed(2)),
    })
  }
}
