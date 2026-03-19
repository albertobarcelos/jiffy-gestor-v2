/**
 * Entidade para métricas de vendas do dashboard
 */
export class DashboardVendas {
  private constructor(
    private readonly totalFaturado: number,
    private readonly countVendasEfetivadas: number,
    private readonly countVendasCanceladas: number,
    private readonly countProdutosVendidos: number,
  ) {}

  static create(data: {
    totalFaturado?: number
    countVendasEfetivadas?: number
    countVendasCanceladas?: number
    countProdutosVendidos?: number
  }): DashboardVendas {
    return new DashboardVendas(
      data.totalFaturado ?? 0,
      data.countVendasEfetivadas ?? 0,
      data.countVendasCanceladas ?? 0,
      data.countProdutosVendidos ?? 0,
    )
  }

  static fromJSON(data: any): DashboardVendas {
    console.log('🔍 DashboardVendas.fromJSON - Dados recebidos:', {
      temMetricas: !!data?.metricas,
      metricas: data?.metricas,
      itemsCount: data?.items?.length || 0,
      hasNext: data?.hasNext,
      dataCompleta: data,
    })
    const metrics = data?.metricas || {}; // Correção aqui: usar 'metricas'
    const result = DashboardVendas.create({
      totalFaturado: metrics.totalFaturado,
      countVendasEfetivadas: metrics.countVendasEfetivadas,
      countVendasCanceladas: metrics.countVendasCanceladas,
      countProdutosVendidos: metrics.countProdutosVendidos,
    })
    console.log('🔍 DashboardVendas.fromJSON - DashboardVendas criado:', {
      totalFaturado: result.getTotalFaturado(),
      countVendasEfetivadas: result.getCountVendasEfetivadas(),
      countVendasCanceladas: result.getCountVendasCanceladas(),
      countProdutosVendidos: result.getCountProdutosVendidos(),
    })
    return result
  }

  getTotalFaturado(): number {
    return this.totalFaturado
  }

  getCountVendasEfetivadas(): number {
    return this.countVendasEfetivadas
  }

  getCountVendasCanceladas(): number {
    return this.countVendasCanceladas
  }
  
  getCountProdutosVendidos(): number {
    return this.countProdutosVendidos
  }

  getTicketMedio(): number {
    if (this.countVendasEfetivadas === 0) return 0;
    return this.totalFaturado / this.countVendasEfetivadas;
  }
}

