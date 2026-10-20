import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import type { ImpressoraLogica } from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class ListarImpressorasLogicasEstacaoUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  execute(): Promise<ImpressoraLogica[]> {
    return this.gateway.listarImpressorasLogicas()
  }
}
