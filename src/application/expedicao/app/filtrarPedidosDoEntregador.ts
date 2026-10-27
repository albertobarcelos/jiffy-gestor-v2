export type CobrancaAppEntregador = {
  id: string
  meioPagamentoId: string
  valor: number
  pendente: boolean
  nome: string | null
}

export type PedidoResumoAppEntregador = {
  id: string
  codigoVenda: string
  numeroVenda: number | null
  clienteNome: string
  telefone: string | null
  endereco: string | null
  enderecoNavegacao: string | null
  latitude: number | null
  longitude: number | null
  bairro: string | null
  etapa: string | null
  valorFinal: number
  taxaEntrega: number | null
  entregadorId: string | null
  faltaPagar: number
  /** Troco que o motoboy precisa levar — mesma regra do cupom. */
  trocoLevar: number
  observacao: string | null
  formaPagamento: string | null
  meioPagamentoIds: string[]
  cobrancas: CobrancaAppEntregador[]
}

const ETAPAS_ATIVAS = new Set(['PRONTO', 'EM_ROTA'])

export function filtrarPedidosAtivosDoEntregador<T extends { entregadorId: string | null; etapa: string | null }>(
  pedidos: T[],
  entregadorId: string
): T[] {
  const id = entregadorId.trim()
  if (!id) return []
  return pedidos.filter(pedido => {
    if (pedido.entregadorId !== id) return false
    const etapa = String(pedido.etapa ?? '').trim().toUpperCase()
    return ETAPAS_ATIVAS.has(etapa)
  })
}

/** O pedido recém-pego fica no topo mesmo se a listagem paginada ainda não o trouxe. */
export function mesclarPedidoPegoNaLista<T extends { id: string }>(lista: T[], pego: T | null): T[] {
  if (!pego) return lista
  return [pego, ...lista.filter(pedido => pedido.id !== pego.id)]
}
