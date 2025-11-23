import { IGrupoProdutoRepository, CriarGrupoParams } from '@/src/domain/repositories/IGrupoProdutoRepository'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'

/**
 * Use case para criar um grupo de produtos
 */
export class CriarGrupoProdutoUseCase {
  constructor(private readonly repository: IGrupoProdutoRepository) {}

  async execute(params: CriarGrupoParams): Promise<GrupoProduto> {
    if (!params.nome || params.nome.trim() === '') {
      throw new Error('Nome do grupo é obrigatório')
    }

    return this.repository.criarGrupo(params)
  }
}

