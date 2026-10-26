import { mapProdutosDetalheVenda } from '@/src/application/mappers/VendaDetalheProdutosMapper'

/** IDs de itens lançados ainda ativos no pedido delivery (GET). */
export function idsProdutosLancadosAtivosPedido(pedido: Record<string, unknown>): string[] {
  return mapProdutosDetalheVenda(pedido)
    .produtos.map(item => item.produtoLancadoId)
    .filter((id): id is string => Boolean(id))
}

export function filtrarIdsLancadosPresentes(
  ids: string[],
  pedido: Record<string, unknown>
): string[] {
  const presentes = new Set(idsProdutosLancadosAtivosPedido(pedido))
  return ids.filter(id => presentes.has(id))
}
