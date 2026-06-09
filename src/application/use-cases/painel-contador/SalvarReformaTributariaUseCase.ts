import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'

export class SalvarReformaTributariaUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(ncm: string, input: { cst: string; codigoClassificacaoFiscal: string }) {
    await this.repository.salvarReformaTributaria(ncm, input)
  }
}
