/**
 * Entidade para dados de evolução de vendas (gráfico de linha)
 */
export class DashboardEvolucao {
  private constructor(
    private readonly data: string,
    private readonly label: string,
    private readonly valorFinalizadas: number,
    private readonly valorCanceladas: number,
  ) {}

  static create(data: {
    data: string
    label: string
    valorFinalizadas?: number
    valorCanceladas?: number
  }): DashboardEvolucao {
    return new DashboardEvolucao(
      data.data,
      data.label,
      data.valorFinalizadas ?? 0,
      data.valorCanceladas ?? 0,
    )
  }

  // fromJSON pode ser ajustado se a API começar a retornar esses dois valores
  // Por enquanto, a agregação será feita no Use Case.
  static fromJSON(data: any): DashboardEvolucao {
    return DashboardEvolucao.create({
      data: data.data ?? '',
      label: data.label ?? '',
      valorFinalizadas: data.valorFinalizadas ?? data.valor ?? 0, // Fallback para 'valor' se for a estrutura antiga
      valorCanceladas: data.valorCanceladas ?? 0,
    })
  }

  getData(): string {
    return this.data
  }

  getLabel(): string {
    return this.label
  }

  getValorFinalizadas(): number {
    return this.valorFinalizadas
  }

  getValorCanceladas(): number {
    return this.valorCanceladas
  }
}
