/**
 * Entidade para dados de ranking de garçons (usuários PDV) no dashboard.
 */
export class DashboardTopGarcom {
  private constructor(
    private readonly rank: number,
    private readonly nome: string,
    private readonly qtdProdutos: number,
    private readonly qtdVendas: number,
    private readonly valorTotal: number
  ) {}

  static create(data: {
    rank: number
    nome: string
    qtdProdutos: number
    qtdVendas: number
    valorTotal: number
  }): DashboardTopGarcom {
    return new DashboardTopGarcom(
      data.rank,
      data.nome,
      data.qtdProdutos,
      data.qtdVendas,
      data.valorTotal
    )
  }

  static fromJSON(data: Record<string, unknown>): DashboardTopGarcom {
    return DashboardTopGarcom.create({
      rank: typeof data.rank === 'number' ? data.rank : 0,
      nome: typeof data.nome === 'string' ? data.nome : '',
      qtdProdutos: typeof data.qtdProdutos === 'number' ? data.qtdProdutos : 0,
      qtdVendas: typeof data.qtdVendas === 'number' ? data.qtdVendas : 0,
      valorTotal: typeof data.valorTotal === 'number' ? data.valorTotal : 0,
    })
  }

  getRank(): number {
    return this.rank
  }

  getNome(): string {
    return this.nome
  }

  getQtdProdutos(): number {
    return this.qtdProdutos
  }

  getQtdVendas(): number {
    return this.qtdVendas
  }

  getValorTotal(): number {
    return this.valorTotal
  }
}
