import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'

export class ListarConfiguracoesNcmUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(page = 0, size = 1000) {
    const [pagina, configFiscal] = await Promise.all([
      this.repository.listarNcms(page, size),
      this.repository.getConfiguracaoFiscal(),
    ])
    return {
      ncms: pagina.content,
      totalElements: pagina.totalElements,
      regimeTributario: configFiscal?.codigoRegimeTributario ?? null,
      isSimplesNacional: configFiscal?.isSimplesNacional() ?? false,
    }
  }
}
