import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { SalvarCertificadoSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import { CertificadoValidoPolicy } from '@/src/domain/policies/painel-contador/CertificadoValidoPolicy'
import { EtapaDadosFiscaisCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaDadosFiscaisCompletaPolicy'
import type { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'

export class GerenciarCertificadoUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async getCertificado() {
    const result = await this.repository.getCertificado()
    return {
      certificado: result.certificado,
      status: CertificadoValidoPolicy.check(result.certificado),
    }
  }

  async verificarDadosFiscaisCompletos(): Promise<boolean> {
    const [empresa, configFiscal] = await Promise.all([
      this.repository.getEmpresaMe(),
      this.repository.getConfiguracaoFiscal(),
    ])
    return EtapaDadosFiscaisCompletaPolicy.dadosFiscaisCompletos(empresa, configFiscal)
  }

  async upload(input: unknown): Promise<CertificadoDigital | null> {
    const dto = SalvarCertificadoSchema.parse(input)
    await this.repository.salvarCertificado(dto)
    const result = await this.repository.getCertificado()
    return result.certificado
  }

  async remover(): Promise<void> {
    await this.repository.removerCertificado()
  }
}
