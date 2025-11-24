import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class BuscarTopProdutosUseCase {
  constructor(private apiClient: ApiClient) {}

  async execute(_periodo: string = 'mes', limit: number = 10): Promise<DashboardTopProduto[]> {
    // Por enquanto, retorna dados mockados
    // TODO: Implementar chamada real à API quando endpoint estiver disponível
    return Array.from({ length: limit }, (_, index) => {
      return DashboardTopProduto.create({
        produto: `Produto ${String.fromCharCode(65 + index)}`,
        quantidade: 100 + index * 15,
        valorTotal: 5000.0 + index * 500.0,
        rank: index + 1,
      })
    })
  }
}

