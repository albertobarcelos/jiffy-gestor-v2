import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class BuscarMetodosPagamentoUseCase {
  constructor(private apiClient: ApiClient) {}

  async execute(periodo: string = 'mes'): Promise<DashboardMetodoPagamento[]> {
    // Por enquanto, retorna dados mockados
    // TODO: Implementar chamada real à API quando endpoint estiver disponível
    const total = 45000.0
    return [
      DashboardMetodoPagamento.create({
        metodo: 'Dinheiro',
        valor: 20000.0,
        percentual: 44.4,
        quantidade: 450,
      }),
      DashboardMetodoPagamento.create({
        metodo: 'Cartão',
        valor: 18000.0,
        percentual: 40.0,
        quantidade: 400,
      }),
      DashboardMetodoPagamento.create({
        metodo: 'PIX',
        valor: 5000.0,
        percentual: 11.1,
        quantidade: 100,
      }),
      DashboardMetodoPagamento.create({
        metodo: 'Outros',
        valor: 2000.0,
        percentual: 4.5,
        quantidade: 50,
      }),
    ]
  }
}

