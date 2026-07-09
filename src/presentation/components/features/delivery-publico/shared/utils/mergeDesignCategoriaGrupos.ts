import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'

export function mergeDesignCategoriaGrupos(
  incoming: DesignCategoriaGrupo[],
  previous: DesignCategoriaGrupo[]
): DesignCategoriaGrupo[] {
  const previousById = new Map(previous.map(grupo => [grupo.id, grupo]))

  return incoming.map(grupo => {
    const preserved = previousById.get(grupo.id)
    const incomingUrl = grupo.imagemUrl?.trim() || null
    const preservedUrl = preserved?.imagemUrl?.trim() || null

    return {
      ...grupo,
      imagemUrl: incomingUrl ?? preservedUrl,
    }
  })
}
