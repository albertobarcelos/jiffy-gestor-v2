export type ReorderPatch = {
  id: string
  novaPosicao: number
}

/** Indica se a ordem dos ids mudou em relação ao snapshot inicial. */
export function hasReorderChanged(
  initialIds: readonly string[],
  finalIds: readonly string[]
): boolean {
  if (initialIds.length !== finalIds.length) return true
  return initialIds.some((id, index) => id !== finalIds[index])
}

/**
 * Lista patches absolutos (posição 1-based) para itens cuja posição final difere da inicial.
 * Útil para inspeção/testes; a persistência usa `applySequentialReorder`.
 */
export function computeReorderPatches(
  initialIds: readonly string[],
  finalIds: readonly string[]
): ReorderPatch[] {
  const patches: ReorderPatch[] = []
  finalIds.forEach((id, index) => {
    const novaPosicao = index + 1
    const oldIndex = initialIds.indexOf(id)
    if (oldIndex === -1) return
    const oldPosicao = oldIndex + 1
    if (oldPosicao !== novaPosicao) {
      patches.push({ id, novaPosicao })
    }
  })
  return patches
}

/**
 * Aplica reordenação item a item até igualar `finalIds`, evitando corrida de índices no backend.
 */
export async function applySequentialReorder(
  initialIds: readonly string[],
  finalIds: readonly string[],
  reorder: (id: string, novaPosicao: number) => Promise<void>
): Promise<void> {
  if (initialIds.length !== finalIds.length) {
    throw new Error('Listas de reordenação incompatíveis')
  }
  const current = [...initialIds]
  for (let i = 0; i < finalIds.length; i++) {
    const id = finalIds[i]
    const currentIndex = current.indexOf(id)
    if (currentIndex === -1) {
      throw new Error('Item não encontrado na ordem atual')
    }
    if (currentIndex === i) continue
    await reorder(id, i + 1)
    const [removed] = current.splice(currentIndex, 1)
    current.splice(i, 0, removed)
  }
}
