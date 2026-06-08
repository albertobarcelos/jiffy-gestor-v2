import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import type {
  AtualizarEmpresaDTO,
  SalvarFiscalDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class SalvarConfiguracaoEmpresaUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async carregar() {
    const [empresa, configFiscal] = await Promise.all([
      this.repository.getEmpresaMe(),
      this.repository.getConfiguracaoFiscal(),
    ])
    return { empresa, configFiscal }
  }

  async salvar(empresaId: string, empresa: AtualizarEmpresaDTO, fiscal: SalvarFiscalDTO) {
    await this.repository.atualizarEmpresa(empresaId, empresa)
    await this.repository.salvarConfiguracaoFiscal(fiscal)
    return this.carregar()
  }

  async validarCidade(cidade: string, uf: string): Promise<boolean> {
    return this.repository.validarCidade(cidade, uf)
  }
}
