/**
 * Entidade para métricas de vendas do dashboard
 */
export class DashboardVendas {
  private constructor(
    private readonly totalVendas: number,
    private readonly ticketMedio: number,
    private readonly vendasCanceladas: number,
    private readonly vendasEstornadas: number,
    private readonly variacaoPercentual: number,
    private readonly numeroVendas: number
  ) {}

  static create(data: {
    totalVendas?: number
    ticketMedio?: number
    vendasCanceladas?: number
    vendasEstornadas?: number
    variacaoPercentual?: number
    numeroVendas?: number
  }): DashboardVendas {
    return new DashboardVendas(
      data.totalVendas ?? 0,
      data.ticketMedio ?? 0,
      data.vendasCanceladas ?? 0,
      data.vendasEstornadas ?? 0,
      data.variacaoPercentual ?? 0,
      data.numeroVendas ?? 0
    )
  }

  static fromJSON(data: any): DashboardVendas {
    return DashboardVendas.create({
      totalVendas: data.totalVendas,
      ticketMedio: data.ticketMedio,
      vendasCanceladas: data.vendasCanceladas,
      vendasEstornadas: data.vendasEstornadas,
      variacaoPercentual: data.variacaoPercentual,
      numeroVendas: data.numeroVendas,
    })
  }

  getTotalVendas(): number {
    return this.totalVendas
  }

  getTicketMedio(): number {
    return this.ticketMedio
  }

  getVendasCanceladas(): number {
    return this.vendasCanceladas
  }

  getVendasEstornadas(): number {
    return this.vendasEstornadas
  }

  getVariacaoPercentual(): number {
    return this.variacaoPercentual
  }

  getNumeroVendas(): number {
    return this.numeroVendas
  }
}

