import type { ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'

/** Estação de impressão da loja — a mesma para delivery, balcão e caixa deste PC. */
export type EstacaoImpressaoResumo = {
  id: string
  nome: string
  ativo: boolean
  /** Quando true, esta estação recebe PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA. */
  gestorDelivery: boolean
}

export type AtualizarEstacaoImpressaoPatch = {
  nome?: string
  ativo?: boolean
  gestorDelivery?: boolean
}

export type ImpressoraLogica = {
  id: string
  nome: string
}

export type EstacaoImpressaoMapeamento = {
  impressoraId: string
  nomeImpressora: string
  nomeImpressoraWindows: string
  modoImpressao?: ModoImpressaoImpressora
}

export type MapeamentoEstacaoParaSalvar = {
  impressoraId: string
  nomeImpressoraWindows: string
  modoImpressao: ModoImpressaoImpressora
}

export type EstacaoImpressaoConfigResolvida = {
  estacaoId: string
  gestorDelivery: boolean
  mapeamentos: EstacaoImpressaoMapeamento[]
}

export const ESTACAO_IMPRESSAO_CONFIG_VAZIA: EstacaoImpressaoConfigResolvida = {
  estacaoId: '',
  gestorDelivery: false,
  mapeamentos: [],
}

export class EstacaoImpressaoNaoEncontradaError extends Error {
  readonly status = 404

  constructor(message = 'Estação de impressão não encontrada.') {
    super(message)
    this.name = 'EstacaoImpressaoNaoEncontradaError'
  }
}
