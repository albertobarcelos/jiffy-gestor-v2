/**
 * Entidade para dados de vendas por terminal
 */
export class DashboardVendasTerminal {
  private constructor(
    private readonly terminal: string,
    private readonly valor: number,
    private readonly quantidade: number
  ) {}

  static create(data: {
    terminal: string
    valor: number
    quantidade: number
  }): DashboardVendasTerminal {
    return new DashboardVendasTerminal(data.terminal, data.valor, data.quantidade)
  }

  static fromJSON(data: any): DashboardVendasTerminal {
    return DashboardVendasTerminal.create({
      terminal: data.terminal ?? '',
      valor: data.valor ?? 0,
      quantidade: data.quantidade ?? 0,
    })
  }

  getTerminal(): string {
    return this.terminal
  }

  getValor(): number {
    return this.valor
  }

  getQuantidade(): number {
    return this.quantidade
  }
}

