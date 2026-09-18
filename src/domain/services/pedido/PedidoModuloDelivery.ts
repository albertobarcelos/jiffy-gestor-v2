export function ehPedidoModuloDelivery(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null
): boolean {
  if (tabelaOrigem !== 'venda_gestor') return false
  const tipo = String(tipoVenda ?? '')
    .trim()
    .toLowerCase()
  return tipo === 'entrega' || tipo === 'retirada'
}
