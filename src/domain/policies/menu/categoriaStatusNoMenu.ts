/** Status do snapshot neste cardápio. Ausente = ativo (default do backend). */
export function categoriaAtivaNoSnapshot(grupo: {
  ativo?: boolean | null
}): boolean {
  return grupo.ativo !== false
}
