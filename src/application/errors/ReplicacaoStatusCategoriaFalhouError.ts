/** A categoria base já gravou; a publicação nos cardápios não fechou. */
export class ReplicacaoStatusCategoriaFalhouError extends Error {
  readonly code = 'REPLICACAO_STATUS_CATEGORIA_FALHOU' as const

  constructor(message = 'Categoria atualizada no cadastro, mas não foi possível sincronizar todos os cardápios.') {
    super(message)
    this.name = 'ReplicacaoStatusCategoriaFalhouError'
  }
}

export function isReplicacaoStatusCategoriaFalhou(
  error: unknown
): error is ReplicacaoStatusCategoriaFalhouError {
  return error instanceof ReplicacaoStatusCategoriaFalhouError
}
