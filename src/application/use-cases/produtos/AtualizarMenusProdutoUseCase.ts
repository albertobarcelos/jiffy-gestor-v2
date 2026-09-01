import { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'
import { Produto } from '@/src/domain/entities/Produto'

export interface AtualizarMenusProdutoInput {
  add?: string[]
  remove?: string[]
}

/**
 * Caso de uso: atualizar vínculos do produto com menus.
 * Não altera snapshot (preço/nome) — só add/remove de MenuProduto.
 */
export class AtualizarMenusProdutoUseCase {
  constructor(private readonly produtoRepository: IProdutoRepository) {}

  async execute(produtoId: string, input: AtualizarMenusProdutoInput): Promise<Produto> {
    if (!produtoId.trim()) {
      throw new Error('ID do produto é obrigatório')
    }

    const add = Array.isArray(input.add) ? input.add.filter(Boolean) : []
    const remove = Array.isArray(input.remove) ? input.remove.filter(Boolean) : []

    return this.produtoRepository.atualizarMenus(produtoId, { add, remove })
  }
}
