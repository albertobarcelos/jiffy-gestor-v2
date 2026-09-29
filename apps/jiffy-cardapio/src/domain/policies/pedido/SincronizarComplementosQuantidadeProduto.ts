import type { ItemCarrinhoComplemento } from '@/src/domain/types/carrinho'

/**
 * Expande a receita por unidade para o contrato UN do backend/cotação.
 * Não usar no carrinho nem no modal: lá a quantidade do complemento é receita
 * e não sobe com a quantidade do produto.
 */
export function sincronizarComplementosQuantidadeProduto<T extends { quantidade: number }>(
  complementos: T[],
  quantidadeProduto: number
): T[] {
  if (complementos.length === 0) return complementos
  const qtdProd = Math.max(1, Math.floor(quantidadeProduto))
  if (qtdProd <= 1) return complementos
  return complementos.map(comp => ({
    ...comp,
    quantidade: Math.max(1, Math.floor(comp.quantidade)) * qtdProd,
  }))
}

export function sincronizarComplementosCarrinho(
  complementos: ItemCarrinhoComplemento[],
  quantidadeProduto: number
): ItemCarrinhoComplemento[] {
  return sincronizarComplementosQuantidadeProduto(complementos, quantidadeProduto)
}
