import type { IDocumentoFiscalRepository } from '@/src/domain/repositories/IDocumentoFiscalRepository'

export class BuscarDocumentoFiscalUseCase {
  constructor(private readonly repository: IDocumentoFiscalRepository) {}

  async execute(documentId: string) {
    const id = documentId?.trim()
    if (!id) {
      throw new Error('ID do documento fiscal é obrigatório')
    }
    return this.repository.buscarPorId(id)
  }
}
