import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'

export interface EtapaEmissorFiscalResult {
  concluida: boolean
  motivo?: string
}

export class EtapaEmissorFiscalCompletaPolicy {
  static check(configuracoes: ConfiguracaoEmissao[]): EtapaEmissorFiscalResult {
    const principais = configuracoes.filter((c) => c.isPrincipal())
    const nfe = principais.find((c) => c.modelo === 55)
    const nfce = principais.find((c) => c.modelo === 65)

    const peloMenosUmaAtiva = (nfe?.estaAtiva() ?? false) || (nfce?.estaAtiva() ?? false)

    if (!peloMenosUmaAtiva) {
      return {
        concluida: false,
        motivo:
          'Pelo menos um modelo de nota (NF-e ou NFC-e) deve ser ativado e configurado corretamente.',
      }
    }

    const nfeCompleta = nfe?.estaCompleta() ?? false
    const nfceCompleta = nfce?.estaCompleta() ?? false

    if (nfeCompleta || nfceCompleta) {
      return { concluida: true }
    }

    return {
      concluida: false,
      motivo:
        'Pelo menos um modelo de nota (NF-e ou NFC-e) deve ser ativado e configurado corretamente.',
    }
  }
}
