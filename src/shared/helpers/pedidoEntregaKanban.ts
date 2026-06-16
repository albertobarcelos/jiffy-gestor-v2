/**
 * Normaliza `tipoVenda` do unificado / detalhe para o Kanban operacional (entrega/retirada).
 * - Módulo delivery grava `delivery` na venda; `tipoEntrega` vem em `entrega` | `retirada`.
 * - Legado gestor usa `entrega` | `retirada` direto em `tipoVenda`.
 */
export function normalizarTipoAtendimentoKanban(tipoVenda?: string | null): string {
  return String(tipoVenda ?? '').trim().toLowerCase()
}

export function isTipoVendaBalcaoGestor(tipoVenda?: string | null): boolean {
  const tipo = normalizarTipoAtendimentoKanban(tipoVenda)
  return tipo === 'balcao' || tipo === 'mesa' || tipo === 'gestor'
}

/** Pedido de entrega/retirada no Kanban (não balcão). */
export function isPedidoEntregaKanban(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null,
  statusEtapaOperacional?: string | null
): boolean {
  if (tabelaOrigem !== 'venda_gestor') return false
  const tipo = normalizarTipoAtendimentoKanban(tipoVenda)
  if (isTipoVendaBalcaoGestor(tipo)) return false
  if (tipo === 'entrega' || tipo === 'retirada' || tipo === 'delivery') return true
  if (!tipo && String(statusEtapaOperacional ?? '').trim()) return true
  return false
}

export function isPedidoEntregaComEntregador(tipoVenda?: string | null): boolean {
  return normalizarTipoAtendimentoKanban(tipoVenda) === 'entrega'
}
