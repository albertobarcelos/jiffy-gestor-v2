export type FiltroListagemMeiosNovoPedido = {
  ativo?: true
}

/**
 * Pedido manual no Gestor (balcão ou delivery): lista os meios ativos do POS.
 * Entrega/retirada desligada não esconde o meio aqui — isso vale só no
 * checkout do cliente, para ele não escolher um canal que a loja não oferece.
 */
export function resolverFiltroMeiosPagamentoNovoPedido(): FiltroListagemMeiosNovoPedido {
  return { ativo: true }
}
