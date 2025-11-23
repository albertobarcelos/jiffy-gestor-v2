/**
 * Entidade de domínio representando um Produto
 */
export class Produto {
  private constructor(
    private readonly id: string,
    private readonly codigoProduto: string,
    private readonly nome: string,
    private readonly valor: number,
    private readonly ativo: boolean,
    private readonly nomeGrupo?: string,
    private readonly estoque?: number | string
  ) {}

  static create(
    id: string,
    codigoProduto: string,
    nome: string,
    valor: number,
    ativo: boolean,
    nomeGrupo?: string,
    estoque?: number | string
  ): Produto {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Produto(id, codigoProduto, nome, valor, ativo, nomeGrupo, estoque)
  }

  static fromJSON(data: any): Produto {
    return Produto.create(
      data.id?.toString() || '',
      data.codigoProduto?.toString() || '',
      data.nome?.toString() || '',
      typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
      data.ativo === true || data.ativo === 'true',
      data.nomeGrupo?.toString(),
      data.estoque
    )
  }

  getId(): string {
    return this.id
  }

  getCodigoProduto(): string {
    return this.codigoProduto
  }

  getNome(): string {
    return this.nome
  }

  getValor(): number {
    return this.valor
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getNomeGrupo(): string | undefined {
    return this.nomeGrupo
  }

  getEstoque(): number | string | undefined {
    return this.estoque
  }

  toJSON() {
    return {
      id: this.id,
      codigoProduto: this.codigoProduto,
      nome: this.nome,
      valor: this.valor,
      ativo: this.ativo,
      nomeGrupo: this.nomeGrupo,
      estoque: this.estoque,
    }
  }
}

