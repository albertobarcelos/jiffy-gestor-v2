import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

/** Tolerância para comparar preços em ponto flutuante. */
const EPS_PRECO = 0.0001

/**
 * Indica se o create/PATCH deve enviar `valorUnitario` (preço alterado).
 * Só quando o produto permite alterar preço e o valor da linha difere do catálogo.
 */
export function deveEnviarValorUnitarioAlterado(p: ProdutoSelecionado): boolean {
  if (!p.permiteAlterarPreco) return false
  if (typeof p.valorCatalogo !== 'number' || !Number.isFinite(p.valorCatalogo)) return false
  if (typeof p.valorUnitario !== 'number' || !Number.isFinite(p.valorUnitario)) return false
  return Math.abs(p.valorUnitario - p.valorCatalogo) > EPS_PRECO
}
