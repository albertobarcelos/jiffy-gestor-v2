import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ListarEntregadoresPdvUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(token: string) {
    return this.repo.listarEntregadores(token)
  }
}

export const listarEntregadoresPdvUseCase = new ListarEntregadoresPdvUseCase()
