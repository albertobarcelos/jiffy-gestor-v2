import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class ListarEstacoesImpressaoUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  execute(): Promise<EstacaoImpressaoResumo[]> {
    return this.gateway.listar()
  }
}
