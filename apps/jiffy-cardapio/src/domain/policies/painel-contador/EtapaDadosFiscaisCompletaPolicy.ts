import { EmpresaPainelResumo } from '@/src/domain/entities/painel-contador/EmpresaPainelResumo'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'
import { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'
import {
  CertificadoValidoPolicy,
  CertificadoStatusResult,
} from '@/src/domain/policies/painel-contador/CertificadoValidoPolicy'

export interface EtapaDadosFiscaisResult {
  concluida: boolean
  dadosFiscaisCompletos: boolean
  certificadoStatus: CertificadoStatusResult
  motivo?: string
}

export class EtapaDadosFiscaisCompletaPolicy {
  static dadosFiscaisCompletos(
    empresa: EmpresaPainelResumo | null,
    configFiscal: ConfiguracaoFiscalEmpresa | null
  ): boolean {
    if (!empresa || !configFiscal) return false
    return (
      empresa.temCnpjValido() &&
      empresa.temRazaoSocial() &&
      empresa.temUf() &&
      configFiscal.temInscricaoEstadual() &&
      configFiscal.temRegimeTributario()
    )
  }

  static check(
    empresa: EmpresaPainelResumo | null,
    configFiscal: ConfiguracaoFiscalEmpresa | null,
    certificado: CertificadoDigital | null
  ): EtapaDadosFiscaisResult {
    const dadosCompletos = this.dadosFiscaisCompletos(empresa, configFiscal)
    const certificadoStatus = CertificadoValidoPolicy.check(certificado)

    const concluida = dadosCompletos && certificadoStatus.estaValido

    let motivo: string | undefined
    if (!dadosCompletos) {
      motivo = 'Dados fiscais obrigatórios incompletos.'
    } else if (!certificadoStatus.estaValido) {
      motivo = certificadoStatus.mensagem
    }

    return {
      concluida,
      dadosFiscaisCompletos: dadosCompletos,
      certificadoStatus,
      motivo,
    }
  }
}
