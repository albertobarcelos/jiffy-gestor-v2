import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'

export interface EtapaIbptResult {
  concluida: boolean
  motivo?: string
}

export class EtapaIbptCompletaPolicy {
  static check(configFiscal: ConfiguracaoFiscalEmpresa | null): EtapaIbptResult {
    if (configFiscal?.ibptTokenStatus === 'CADASTRADO') {
      return { concluida: true }
    }
    return {
      concluida: false,
      motivo: 'Chave IBPT não cadastrada.',
    }
  }
}
