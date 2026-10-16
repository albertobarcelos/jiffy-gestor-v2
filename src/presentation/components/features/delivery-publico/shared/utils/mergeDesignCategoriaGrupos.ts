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
    const incomingId = grupo.imageId?.trim() || null
    const preservedId = preserved?.imageId?.trim() || null
    const imagemUrl = incomingUrl ?? preservedUrl

    return {
      ...grupo,
      imagemUrl,
      imageId: imagemUrl ? (incomingId ?? preservedId) : null,
    }
  })
}
