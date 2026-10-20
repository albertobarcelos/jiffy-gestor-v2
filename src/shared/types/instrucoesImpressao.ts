export interface InstrucaoImpressaoWarning {
  code: string
  message: string
  detalhe?: string
  contexto?: Record<string, unknown>
}

export interface InstrucaoImpressaoMapeamento {
  impressoraId: string | null
  impressoraNome: string | null
  nomeImpressoraWindows: string | null
  produtosLancadosIds: string[]
  modoImpressao?: unknown
  modoFicha?: unknown
}

export interface InstrucoesImpressaoResponse {
  mapeamentos: InstrucaoImpressaoMapeamento[]
  warnings: InstrucaoImpressaoWarning[]
}
