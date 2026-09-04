/**
 * Entidade para dados de top produtos
 */
export class DashboardTopProduto {
  private constructor(
    private readonly produto: string,
    private readonly quantidade: number,
    private readonly valorTotal: number,
    private readonly rank: number
  ) {}

  static create(data: {
    produto: string
    quantidade: number
    valorTotal: number
    rank: number
  }): DashboardTopProduto {
    return new DashboardTopProduto(
      data.produto,
      data.quantidade,
      data.valorTotal,
      data.rank
    )
  }

  static fromJSON(data: any): DashboardTopProduto {
    return DashboardTopProduto.create({
      produto: data.produto ?? '',
      quantidade: data.quantidade ?? 0,
      valorTotal: data.valorTotal ?? 0,
      rank: data.rank ?? 0,
    })
  }

  getProduto(): string {
    return this.produto
  }

  getQuantidade(): number {
    return this.quantidade
  }

  getValorTotal(): number {
    return this.valorTotal
  }

  getRank(): number {
    return this.rank
  }
}

