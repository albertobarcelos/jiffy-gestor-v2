import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  mapOperacaoCaixaEstacaoToDTO,
  mapOperacaoCaixaEstacaoToEntity,
} from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'

export class BuscarOperacaoCaixaEstacaoPorIdUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(operacaoCaixaId: string): Promise<OperacaoCaixaEstacaoDTO | null> {
    const id = operacaoCaixaId?.trim()
    if (!id) return null
    const body = await this.gateway.buscarPorId(id)
    const operacao = mapOperacaoCaixaEstacaoToEntity(body)
    return operacao ? mapOperacaoCaixaEstacaoToDTO(operacao) : null
  }
}
