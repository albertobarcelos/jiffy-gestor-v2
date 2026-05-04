/**
 * Entidade para dados de métodos de pagamento
 */
export class DashboardMetodoPagamento {
  private constructor(
    private readonly metodo: string,
    private readonly valor: number,
    private readonly percentual: number,
    private readonly quantidade: number,
    /** Forma fiscal estável (ex.: dinheiro, pix); nome exibido em `metodo` pode ser personalizado. */
    private readonly formaPagamentoFiscal: string
  ) {}

  static create(data: {
    metodo: string
    valor: number
    percentual: number
    quantidade: number
    formaPagamentoFiscal?: string
  }): DashboardMetodoPagamento {
    return new DashboardMetodoPagamento(
      data.metodo,
      data.valor,
      data.percentual,
      data.quantidade,
      data.formaPagamentoFiscal ?? ''
    )
  }

  static fromJSON(data: any): DashboardMetodoPagamento {
    return DashboardMetodoPagamento.create({
      metodo: data.metodo ?? '',
      valor: data.valor ?? 0,
      percentual: data.percentual ?? 0,
      quantidade: data.quantidade ?? 0,
      formaPagamentoFiscal: data.formaPagamentoFiscal ?? '',
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

  getFormaPagamentoFiscal(): string {
    return this.formaPagamentoFiscal
  }
}
