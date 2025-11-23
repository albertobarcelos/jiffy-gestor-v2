import { DashboardEvolucao } from '@/src/domain/entities/DashboardEvolucao'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class BuscarEvolucaoVendasUseCase {
  constructor(private apiClient: ApiClient) {}

  async execute(periodo: string = 'mes'): Promise<DashboardEvolucao[]> {
    // Por enquanto, retorna dados mockados
    // TODO: Implementar chamada real à API quando endpoint estiver disponível
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - index))
      return DashboardEvolucao.create({
        data: date.toISOString().substring(0, 10),
        valor: 1000.0 + index * 50.0 + (index % 3 === 0 ? 200.0 : 0.0),
        label: `Dia ${index + 1}`,
      })
    })
  }
}

