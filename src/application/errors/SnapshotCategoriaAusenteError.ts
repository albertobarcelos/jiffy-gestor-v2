export class SnapshotCategoriaAusenteError extends Error {
  readonly code = 'SNAPSHOT_CATEGORIA_AUSENTE' as const

  constructor(message = 'Categoria não está neste cardápio') {
    super(message)
    this.name = 'SnapshotCategoriaAusenteError'
  }
}

export function isSnapshotCategoriaAusente(error: unknown): boolean {
  return error instanceof SnapshotCategoriaAusenteError
}
