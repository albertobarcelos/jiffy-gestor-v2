import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'
import { ConfiguracaoNcmImpostos } from '@/src/domain/entities/painel-contador/ConfiguracaoNcmImpostos'

export interface EtapaCenarioFiscalResult {
  concluida: boolean
  motivo?: string
}

export class EtapaCenarioFiscalCompletoPolicy {
  static check(
    configFiscal: ConfiguracaoFiscalEmpresa | null,
    ncms: ConfiguracaoNcmImpostos[]
  ): EtapaCenarioFiscalResult {
    if (!configFiscal?.temRegimeTributario()) {
      return {
        concluida: false,
        motivo: 'Regime tributário não configurado.',
      }
    }

    if (ncms.length === 0) {
      return {
        concluida: false,
        motivo: 'Nenhum NCM cadastrado. Configure o cenário fiscal.',
      }
    }

    const isSimples = configFiscal.isSimplesNacional()

    for (const ncm of ncms) {
      if (!ncm.temConfiguracaoObrigatoria(isSimples)) {
        return {
          concluida: false,
          motivo: `NCM ${ncm.codigo} sem configuração obrigatória (${isSimples ? 'CSOSN' : 'CST ICMS'}).`,
        }
      }
    }

    return { concluida: true }
  }
}
