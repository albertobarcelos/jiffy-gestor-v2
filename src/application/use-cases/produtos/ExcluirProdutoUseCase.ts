import type { IProdutoRepository } from '@/src/domain/repositories/IProdutoRepository'

export class ExcluirProdutoUseCase {
  constructor(private readonly produtoRepository: IProdutoRepository) {}

  async execute(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new Error('ID do produto é obrigatório')
    }
    await this.produtoRepository.excluirProduto(id.trim())
  }
}
