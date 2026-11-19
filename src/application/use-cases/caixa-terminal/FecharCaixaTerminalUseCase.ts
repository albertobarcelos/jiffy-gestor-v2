import type {
  FecharCaixaTerminalInput,
  FecharCaixaTerminalResult,
} from '@/src/application/dto/caixa-terminal/FecharCaixaTerminalDTO'
import type { IOperacaoCaixaTerminalGateway } from '@/src/application/ports/IOperacaoCaixaTerminalGateway'
import { FecharCaixaTerminalSchema } from '@/src/application/validators/caixa-terminal/CaixaTerminalInputSchemas'

export class FecharCaixaTerminalUseCase {
  constructor(private readonly gateway: IOperacaoCaixaTerminalGateway) {}

  async execute(
    terminalId: string,
    input: FecharCaixaTerminalInput
  ): Promise<FecharCaixaTerminalResult> {
    const id = terminalId?.trim()
    if (!id) throw new Error('Terminal da operação de caixa é obrigatório.')

    const parsed = FecharCaixaTerminalSchema.parse(input)
    return this.gateway.fechar(id, {
      valorFornecido: Number(parsed.valorFornecido.toFixed(2)),
      fechadoPorId: parsed.fechadoPorId,
    })
  }
}
