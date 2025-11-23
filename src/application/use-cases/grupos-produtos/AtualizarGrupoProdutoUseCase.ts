import { IGrupoProdutoRepository, AtualizarGrupoParams } from '@/src/domain/repositories/IGrupoProdutoRepository'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

/**
 * Use case para atualizar um grupo de produtos
 */
export class AtualizarGrupoProdutoUseCase {
  constructor(private readonly repository: IGrupoProdutoRepository) {}

  async execute(id: string, params: AtualizarGrupoParams): Promise<GrupoProduto> {
    if (!id) {
      throw new Error('ID do grupo é obrigatório')
    }

    return this.repository.atualizarGrupo(id, params)
  }
}

