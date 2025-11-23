/**
 * Entidade para dados de evolução de vendas (gráfico de linha)
 */
export class DashboardEvolucao {
  private constructor(
    private readonly data: string,
    private readonly valor: number,
    private readonly label: string
  ) {}

  static create(data: {
    data: string
    valor: number
    label: string
  }): DashboardEvolucao {
    return new DashboardEvolucao(data.data, data.valor, data.label)
  }

  static fromJSON(data: any): DashboardEvolucao {
    return DashboardEvolucao.create({
      data: data.data ?? '',
      valor: data.valor ?? 0,
      label: data.label ?? '',
    })
  }

  getData(): string {
    return this.data
  }

  getValor(): number {
    return this.valor
  }

  getLabel(): string {
    return this.label
  }
}

