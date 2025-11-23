import { IComplementoRepository } from '@/src/domain/repositories/IComplementoRepository'

/**
 * Caso de uso para deletar complemento
 */
export class DeletarComplementoUseCase {
  constructor(private repository: IComplementoRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do complemento é obrigatório')
    }

    return this.repository.deletarComplemento(id)
  }
}

