import { IGrupoProdutoRepository } from '@/src/domain/repositories/IGrupoProdutoRepository'

/**
 * Use case para reordenar um grupo de produtos
 */
export class ReordenarGrupoProdutoUseCase {
  constructor(private readonly repository: IGrupoProdutoRepository) {}

  async execute(id: string, novaPosicao: number): Promise<void> {
    if (!id) {
      throw new Error('ID do grupo é obrigatório')
    }

    if (novaPosicao < 1) {
      throw new Error('Nova posição deve ser maior que zero')
    }

    return this.repository.reordenarGrupo(id, novaPosicao)
  }
}

