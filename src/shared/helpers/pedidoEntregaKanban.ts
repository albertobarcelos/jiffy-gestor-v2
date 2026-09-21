/**
 * Classificação delivery vs balcão.
 * Backend: `tipoVenda === "delivery"`. Atendimento é só `tipoEntrega`.
 */

export function normalizarTipoAtendimentoKanban(tipoVenda?: string | null): string {
  return String(tipoVenda ?? '').trim().toLowerCase()
}

export function isTipoVendaBalcaoGestor(tipoVenda?: string | null): boolean {
  const tipo = normalizarTipoAtendimentoKanban(tipoVenda)
  return tipo === 'balcao' || tipo === 'mesa' || tipo === 'gestor'
}

export function normalizarTipoEntregaKanban(
  tipoEntrega?: string | null
): 'entrega' | 'retirada' | null {
  const tipo = String(tipoEntrega ?? '')
    .trim()
    .toLowerCase()
  if (tipo === 'entrega' || tipo === 'retirada') return tipo
  return null
}

/** Pedido do módulo delivery. POS nunca entra. */
export function isPedidoEntregaKanban(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null
): boolean {
  if (tabelaOrigem !== 'venda_gestor') return false
  return normalizarTipoAtendimentoKanban(tipoVenda) === 'delivery'
}

/** Precisa de entregador para despachar: só `tipoEntrega=entrega`. */
export function isPedidoEntregaComEntregador(tipoEntrega?: string | null): boolean {
  return normalizarTipoEntregaKanban(tipoEntrega) === 'entrega'
}
