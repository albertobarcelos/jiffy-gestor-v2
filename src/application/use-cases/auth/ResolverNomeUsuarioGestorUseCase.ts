import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ResolverNomeUsuarioGestorUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(token: string, fallbackNome?: string): Promise<string> {
    const meData = await this.repo.buscarAuthMe(token)
    const userId = String(meData?.sub ?? meData?.userId ?? '').trim()
    if (!userId) return fallbackNome ?? ''

    const gestorData = await this.repo.buscarUsuarioGestor(userId, token)
    if (!gestorData) return fallbackNome ?? ''

    return String(gestorData.nome ?? gestorData.username ?? fallbackNome ?? '').trim()
  }
}

export const resolverNomeUsuarioGestorUseCase = new ResolverNomeUsuarioGestorUseCase()
