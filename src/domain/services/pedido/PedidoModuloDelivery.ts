export function ehPedidoModuloDelivery(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null
): boolean {
  if (tabelaOrigem !== 'venda_gestor') return false
  return String(tipoVenda ?? '')
    .trim()
    .toLowerCase() === 'delivery'
}
