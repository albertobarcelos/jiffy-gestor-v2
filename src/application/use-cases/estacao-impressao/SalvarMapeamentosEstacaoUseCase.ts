import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import type {
  EstacaoImpressaoMapeamento,
  MapeamentoEstacaoParaSalvar,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class SalvarMapeamentosEstacaoUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  async execute(
    estacaoId: string,
    mapeamentos: MapeamentoEstacaoParaSalvar[]
  ): Promise<EstacaoImpressaoMapeamento[]> {
    const id = estacaoId.trim()
    if (!id) throw new Error('Selecione uma estação para salvar os vínculos.')
    return this.gateway.salvarMapeamentos(id, mapeamentos)
  }
}
