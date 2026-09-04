export type EtapaPainelId =
  | 'etapa-1-dados-fiscais'
  | 'etapa-2-emissor-fiscal'
  | 'etapa-3-cenario-fiscal'
  | 'etapa-4-numeracoes-fiscais'

export interface ProgressoEtapasMap {
  'etapa-1-dados-fiscais': boolean
  'etapa-2-emissor-fiscal': boolean
  'etapa-3-cenario-fiscal': boolean
  'etapa-4-numeracoes-fiscais': boolean
}

export class EtapaHabilitadaPolicy {
  static check(etapaId: EtapaPainelId, etapasConcluidas: ProgressoEtapasMap): boolean {
    if (etapaId === 'etapa-1-dados-fiscais') return true
    if (etapaId === 'etapa-2-emissor-fiscal') {
      return etapasConcluidas['etapa-1-dados-fiscais'] === true
    }
    if (etapaId === 'etapa-3-cenario-fiscal') {
      return etapasConcluidas['etapa-2-emissor-fiscal'] === true
    }
    return true
  }

  static mensagemBloqueio(etapaId: EtapaPainelId): string {
    if (etapaId === 'etapa-2-emissor-fiscal') {
      return 'Complete primeiro a etapa "Configurações Fiscais" para acessar o Emissor Fiscal.'
    }
    if (etapaId === 'etapa-3-cenario-fiscal') {
      return 'Complete primeiro a etapa "Emissor Fiscal" (ative pelo menos um modelo de nota) para acessar o Cenário Fiscal.'
    }
    return 'Esta etapa não está disponível no momento.'
  }
}
