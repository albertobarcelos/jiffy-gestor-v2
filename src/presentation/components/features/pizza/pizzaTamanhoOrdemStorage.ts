const STORAGE_PREFIX = 'jiffy:pizza-tamanho-ordem:'

function storageKey(categoriaId: string) {
  return `${STORAGE_PREFIX}${categoriaId}`
}

/** Lê a ordem de ids de tamanho salva no browser para a categoria. */
export function lerOrdemTamanhos(categoriaId: string): string[] | null {
  if (typeof window === 'undefined' || !categoriaId) return null
  try {
    const raw = window.localStorage.getItem(storageKey(categoriaId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Persiste a ordem visual dos tamanhos (ids do servidor) para a categoria. */
export function gravarOrdemTamanhos(categoriaId: string, tamanhoIds: string[]): void {
  if (typeof window === 'undefined' || !categoriaId) return
  const ids = tamanhoIds.filter(Boolean)
  if (ids.length === 0) return
  try {
    window.localStorage.setItem(storageKey(categoriaId), JSON.stringify(ids))
  } catch {
    // quota / private mode — ignore
  }
}

/**
 * Reordena itens conforme ids salvos. Itens sem id ou fora da lista
 * ficam no final, na ordem original relativa.
 */
export function aplicarOrdemTamanhosSalva<T extends { id?: string }>(
  items: T[],
  orderedIds: string[] | null | undefined
): T[] {
  if (!orderedIds || orderedIds.length === 0) return items

  const indexById = new Map(orderedIds.map((id, index) => [id, index]))
  const ranked: { item: T; rank: number; originalIndex: number }[] = []
  const unranked: { item: T; originalIndex: number }[] = []

  items.forEach((item, originalIndex) => {
    const id = item.id
    if (id && indexById.has(id)) {
      ranked.push({ item, rank: indexById.get(id)!, originalIndex })
    } else {
      unranked.push({ item, originalIndex })
    }
  })

  ranked.sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex)
  unranked.sort((a, b) => a.originalIndex - b.originalIndex)

  return [...ranked.map(r => r.item), ...unranked.map(u => u.item)]
}

/** Extrai ids de servidor na ordem atual do draft (ignora cards ainda sem id). */
export function coletarIdsTamanhosOrdenados(tamanhos: Array<{ id?: string }>): string[] {
  return tamanhos.map(t => t.id).filter((id): id is string => Boolean(id))
}
