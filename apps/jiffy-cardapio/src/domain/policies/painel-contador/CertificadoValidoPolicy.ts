import { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'

export interface CertificadoStatusResult {
  existe: boolean
  temValidade: boolean
  estaValido: boolean
  mensagem: string
}

export class CertificadoValidoPolicy {
  static check(certificado: CertificadoDigital | null): CertificadoStatusResult {
    if (!certificado) {
      return {
        existe: false,
        temValidade: false,
        estaValido: false,
        mensagem: 'Certificado não encontrado. Cadastre um certificado digital para continuar.',
      }
    }

    if (!certificado.temValidade()) {
      return {
        existe: true,
        temValidade: false,
        estaValido: true,
        mensagem: 'Certificado cadastrado. Aguardando processamento da validade.',
      }
    }

    if (certificado.estaExpirado()) {
      const validade = certificado.validadeCertificado!
      return {
        existe: true,
        temValidade: true,
        estaValido: false,
        mensagem: `Certificado expirado em ${validade.toLocaleDateString('pt-BR')}. Cadastre um novo certificado válido.`,
      }
    }

    const validade = certificado.validadeCertificado!
    const dias = certificado.diasRestantes() ?? 0
    return {
      existe: true,
      temValidade: true,
      estaValido: true,
      mensagem:
        dias <= 30
          ? `Certificado válido até ${validade.toLocaleDateString('pt-BR')} (${dias} dias restantes).`
          : `Certificado válido até ${validade.toLocaleDateString('pt-BR')}.`,
    }
  }
}
