import { IImpressoraRepository } from '@/src/domain/repositories/IImpressoraRepository'

/**
 * Caso de uso para deletar impressora
 */
export class DeletarImpressoraUseCase {
  constructor(private repository: IImpressoraRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID da impressora é obrigatório')
    }

    return this.repository.deletarImpressora(id)
  }
}

