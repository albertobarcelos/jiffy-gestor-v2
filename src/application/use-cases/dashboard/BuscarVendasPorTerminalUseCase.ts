import { DashboardVendasTerminal } from '@/src/domain/entities/DashboardVendasTerminal'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class BuscarVendasPorTerminalUseCase {
  constructor(private apiClient: ApiClient) {}

  async execute(periodo: string = 'mes'): Promise<DashboardVendasTerminal[]> {
    // Por enquanto, retorna dados mockados
    // TODO: Implementar chamada real à API quando endpoint estiver disponível
    return [
      DashboardVendasTerminal.create({
        terminal: 'Terminal 01',
        valor: 15000.0,
        quantidade: 350,
      }),
      DashboardVendasTerminal.create({
        terminal: 'Terminal 02',
        valor: 18000.0,
        quantidade: 420,
      }),
      DashboardVendasTerminal.create({
        terminal: 'Terminal 03',
        valor: 12000.0,
        quantidade: 280,
      }),
      DashboardVendasTerminal.create({
        terminal: 'Terminal 04',
        valor: 8000.0,
        quantidade: 190,
      }),
      DashboardVendasTerminal.create({
        terminal: 'Terminal 05',
        valor: 6000.0,
        quantidade: 140,
      }),
    ]
  }
}

