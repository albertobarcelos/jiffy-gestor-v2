import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'

export class ConsultarHistoricoNcmUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(ncm: string) {
    return this.repository.getHistoricoNcm(ncm)
  }
}
