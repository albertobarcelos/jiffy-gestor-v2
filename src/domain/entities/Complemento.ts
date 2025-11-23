/**
 * Entidade de domínio representando um Complemento
 */
export class Complemento {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly descricao?: string,
    private readonly valor: number = 0,
    private readonly ativo: boolean = true,
    private readonly tipoImpactoPreco?: string,
    private readonly ordem?: number
  ) {}

  static create(
    id: string,
    nome: string,
    descricao?: string,
    valor: number = 0,
    ativo: boolean = true,
    tipoImpactoPreco?: string,
    ordem?: number
  ): Complemento {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Complemento(id, nome, descricao, valor, ativo, tipoImpactoPreco, ordem)
  }

  static fromJSON(data: any): Complemento {
    return Complemento.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      data.descricao?.toString(),
      typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
      data.ativo === true || data.ativo === 'true',
      data.tipoImpactoPreco?.toString(),
      data.ordem ? parseInt(data.ordem.toString(), 10) : undefined
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getDescricao(): string | undefined {
    return this.descricao
  }

  getValor(): number {
    return this.valor
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getTipoImpactoPreco(): string | undefined {
    return this.tipoImpactoPreco
  }

  getOrdem(): number | undefined {
    return this.ordem
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      valor: this.valor,
      ativo: this.ativo,
      tipoImpactoPreco: this.tipoImpactoPreco,
      ordem: this.ordem,
    }
  }
}

