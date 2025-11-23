import { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'
import { Produto } from '@/src/domain/entities/Produto'

/**
 * Caso de uso: Atualizar status do produto
 * Orquestra a lógica de atualização de status
 */
export class AtualizarStatusProdutoUseCase {
  constructor(private readonly produtoRepository: IProdutoRepository) {}

  /**
   * Executa a atualização de status
   * @param id - ID do produto
   * @param ativo - Novo status
   * @returns Promise com o produto atualizado
   */
  async execute(id: string, ativo: boolean): Promise<Produto> {
    if (!id) {
      throw new Error('ID do produto é obrigatório')
    }

    return this.produtoRepository.atualizarStatus(id, ativo)
  }
}

