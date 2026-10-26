/** Marcar este item completa a conferência do pedido (vai para o próximo). */
export function marcarItemCompletaConferencia(input: {
  itemIds: string[]
  marcados: Record<string, boolean>
  itemId: string
}): boolean {
  const passaraAMarcado = !input.marcados[input.itemId]
  if (!passaraAMarcado) return false
  if (input.itemIds.length === 0) return true
  return input.itemIds.every(id => (id === input.itemId ? true : Boolean(input.marcados[id])))
}
