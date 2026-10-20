import type { ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'

export interface EstacaoImpressaoMapeamento {
  impressoraId: string
  nomeImpressora: string
  nomeImpressoraWindows: string
  /** Homolog: modo da via nesta estação (`PUT/GET .../estacoes-impressao/{id}/impressoras`). */
  modoImpressao?: ModoImpressaoImpressora
}
