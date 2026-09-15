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
}
