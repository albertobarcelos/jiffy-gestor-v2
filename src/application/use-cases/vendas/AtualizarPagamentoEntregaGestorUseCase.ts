import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type PagamentoEntregaPatchItem = {
  meioPagamentoId: string
  valor: number
}

export class AtualizarPagamentoEntregaGestorUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(vendaId: string, token: string, pagamentos: PagamentoEntregaPatchItem[]) {
    return this.repo.atualizarPagamentosVendaGestor(vendaId, token, pagamentos)
  }
}

export const atualizarPagamentoEntregaGestorUseCase =
  new AtualizarPagamentoEntregaGestorUseCase()
