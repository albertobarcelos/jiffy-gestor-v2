import { IGrupoProdutoRepository, BuscarGruposParams, BuscarGruposResponse } from '@/src/domain/repositories/IGrupoProdutoRepository'

/**
 * Use case para buscar grupos de produtos
 */
export class BuscarGruposProdutosUseCase {
  constructor(private readonly repository: IGrupoProdutoRepository) {}

  async execute(params: BuscarGruposParams): Promise<BuscarGruposResponse> {
    return this.repository.buscarGrupos(params)
  }
}

