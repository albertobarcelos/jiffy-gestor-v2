/**
 * Item de carrinho do delivery público — shape canônico de domínio
 * (persistido pelo Zustand; campos de UI/envelope inclusos).
 */
export type ItemCarrinhoComplemento = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
  nome: string
  valor: number
  tipoImpactoPreco: string
}

export type ItemCarrinhoDelivery = {
  id: string
  produtoId: string
  produtoNome: string
  produtoImagemUrl: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  observacoes: string[]
  complementos: ItemCarrinhoComplemento[]
  adicionadoEm: string
  /**
   * Preço normal riscado na UI (quando havia promoção vigente ao adicionar).
   * Não entra no cálculo do pedido — só exibição no card do carrinho.
   */
  precoRegular?: number | null
  /** % OFF derivado ao adicionar — só exibição; cobrança usa valorUnitario. */
  descontoPercentual?: number | null
}
