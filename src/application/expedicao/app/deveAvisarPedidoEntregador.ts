const ATIVAS = new Set(['PRONTO', 'EM_ROTA'])

export function deveAvisarPedidoEntregador(input: {
  entregadorId: string
  pedidoEntregadorId: string | null
  etapa: string | null
  pedidoId: string
  idsJaVistos: ReadonlySet<string>
}): boolean {
  const eu = input.entregadorId.trim()
  if (!eu || input.pedidoEntregadorId !== eu) return false
  const etapa = String(input.etapa ?? '').trim().toUpperCase()
  if (!ATIVAS.has(etapa)) return false
  return !input.idsJaVistos.has(input.pedidoId)
}
