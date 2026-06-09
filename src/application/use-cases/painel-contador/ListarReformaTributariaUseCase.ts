import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'

export class ListarReformaTributariaUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute() {
    return this.repository.listarReformaTributaria()
  }
}
