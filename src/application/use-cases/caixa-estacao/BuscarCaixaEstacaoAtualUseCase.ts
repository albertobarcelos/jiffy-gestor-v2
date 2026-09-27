import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { interpretarCaixaEstacaoAtual } from '@/src/application/caixa-estacao/interpretarCaixaEstacaoAtual'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'

export class BuscarCaixaEstacaoAtualUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(estacaoGestorId: string): Promise<CaixaEstacaoAtualDTO> {
    const id = estacaoGestorId?.trim()
    if (!id) return { aberta: false, operacao: null }
    const { status, body } = await this.gateway.buscarAtual(id)
    return interpretarCaixaEstacaoAtual(status, body)
  }
}
