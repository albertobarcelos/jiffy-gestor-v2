/**
 * Entidade para dados de métodos de pagamento
 */
export class DashboardMetodoPagamento {
  private constructor(
    private readonly metodo: string,
    private readonly valor: number,
    private readonly percentual: number,
    private readonly quantidade: number
  ) {}

  static create(data: {
    metodo: string
    valor: number
    percentual: number
    quantidade: number
  }): DashboardMetodoPagamento {
    return new DashboardMetodoPagamento(
      data.metodo,
      data.valor,
      data.percentual,
      data.quantidade
    )
  }

  static fromJSON(data: any): DashboardMetodoPagamento {
    return DashboardMetodoPagamento.create({
      metodo: data.metodo ?? '',
      valor: data.valor ?? 0,
      percentual: data.percentual ?? 0,
      quantidade: data.quantidade ?? 0,
    })
  }

  getMetodo(): string {
    return this.metodo
  }

  getValor(): number {
    return this.valor
  }

  getPercentual(): number {
    return this.percentual
  }

  getQuantidade(): number {
    return this.quantidade
  }
}

