import type { ItemCarrinhoComplemento } from '@/src/domain/types/carrinho'

/**
 * Cardápio público é sempre UN: com qtd do produto > 1, cada complemento
 * na linha deve ter a mesma quantidade (contrato alinhado ao PDV / cotação).
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
    quantidade: qtdProd,
  }))
}

export function sincronizarComplementosCarrinho(
  complementos: ItemCarrinhoComplemento[],
  quantidadeProduto: number
): ItemCarrinhoComplemento[] {
  return sincronizarComplementosQuantidadeProduto(complementos, quantidadeProduto)
}
