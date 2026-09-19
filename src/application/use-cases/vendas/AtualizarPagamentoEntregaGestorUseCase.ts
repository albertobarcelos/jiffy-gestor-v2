import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

export type PagamentoEntregaPatchItem = {
  meioPagamentoId: string
  valor: number
}

export class AtualizarPagamentoEntregaGestorUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(vendaId: string, token: string, pagamentos: PagamentoEntregaPatchItem[]) {
    return this.repo.atualizarPagamentosVendaGestor(vendaId, token, pagamentos)
  }
}
