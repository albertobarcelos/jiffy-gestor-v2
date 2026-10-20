import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import {
  EstacaoImpressaoNaoEncontradaError,
  type AtualizarEstacaoImpressaoPatch,
  type EstacaoImpressaoMapeamento,
  type EstacaoImpressaoResumo,
  type ImpressoraLogica,
  type MapeamentoEstacaoParaSalvar,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'
import {
  atualizarEstacaoImpressao,
  buscarImpressorasLogicas,
  buscarMapeamentosEstacao,
  criarEstacaoImpressao,
  invalidarMapeamentosEstacaoCache,
  isEstacaoImpressaoNotFoundError,
  listarEstacoesImpressao,
  salvarMapeamentosEstacao,
} from '@/src/infrastructure/api/estacoesImpressaoApi'

export class EstacaoImpressaoApiRepository implements IEstacaoImpressaoGateway {
  constructor(private readonly token: string) {}

  criar(nome: string): Promise<EstacaoImpressaoResumo> {
    return criarEstacaoImpressao(this.token, nome)
  }

  atualizar(
    estacaoId: string,
    patch: AtualizarEstacaoImpressaoPatch
  ): Promise<EstacaoImpressaoResumo> {
    return atualizarEstacaoImpressao(this.token, estacaoId, patch)
  }

  listar(): Promise<EstacaoImpressaoResumo[]> {
    return listarEstacoesImpressao(this.token)
  }

  listarImpressorasLogicas(): Promise<ImpressoraLogica[]> {
    return buscarImpressorasLogicas(this.token)
  }

  async buscarMapeamentos(estacaoId: string): Promise<EstacaoImpressaoMapeamento[]> {
    try {
      return await buscarMapeamentosEstacao(this.token, estacaoId)
    } catch (error) {
      if (isEstacaoImpressaoNotFoundError(error)) {
        throw new EstacaoImpressaoNaoEncontradaError()
      }
      throw error
    }
  }

  salvarMapeamentos(
    estacaoId: string,
    mapeamentos: MapeamentoEstacaoParaSalvar[]
  ): Promise<EstacaoImpressaoMapeamento[]> {
    return salvarMapeamentosEstacao(this.token, estacaoId, mapeamentos)
  }

  invalidarCacheMapeamentos(estacaoId?: string): void {
    invalidarMapeamentosEstacaoCache(estacaoId)
  }
}
