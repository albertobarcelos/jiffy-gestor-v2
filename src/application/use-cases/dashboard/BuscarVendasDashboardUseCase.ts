import { DashboardVendas } from '@/src/domain/entities/DashboardVendas'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class BuscarVendasDashboardUseCase {
  constructor(private apiClient: ApiClient) {}

  async execute(_periodo: string = 'hoje'): Promise<DashboardVendas> {
    // Por enquanto, retorna dados mockados
    // TODO: Implementar chamada real à API quando endpoint estiver disponível
    return DashboardVendas.create({
      totalVendas: 45000.0,
      ticketMedio: 45.0,
      vendasCanceladas: 12,
      vendasEstornadas: 3,
      variacaoPercentual: 15.5,
      numeroVendas: 1000,
    })
  }
}

