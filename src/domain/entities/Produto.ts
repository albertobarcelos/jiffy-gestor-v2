/**
 * Entidade de domínio representando um Produto
 */
interface ProdutoComplementoResumo {
  id: string
  nome: string
}

interface ProdutoGrupoComplementoResumo {
  id: string
  nome: string
  complementos: ProdutoComplementoResumo[]
}

export class Produto {
  private constructor(
    private readonly id: string,
    private readonly codigoProduto: string,
    private readonly nome: string,
    private readonly valor: number,
    private readonly ativo: boolean,
    private readonly nomeGrupo?: string,
    private readonly estoque?: number | string,
    private readonly favorito?: boolean,
    private readonly abreComplementos?: boolean,
    private readonly permiteAcrescimo?: boolean,
    private readonly permiteDesconto?: boolean,
    private readonly gruposComplementos?: ProdutoGrupoComplementoResumo[]
  ) {}

  static create(
    id: string,
    codigoProduto: string,
    nome: string,
    valor: number,
    ativo: boolean,
    nomeGrupo?: string,
    estoque?: number | string,
    favorito?: boolean,
    abreComplementos?: boolean,
    permiteAcrescimo?: boolean,
    permiteDesconto?: boolean,
    gruposComplementos?: ProdutoGrupoComplementoResumo[]
  ): Produto {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Produto(
      id,
      codigoProduto,
      nome,
      valor,
      ativo,
      nomeGrupo,
      estoque,
      favorito,
      abreComplementos,
      permiteAcrescimo,
      permiteDesconto,
      gruposComplementos
    )
  }

  static fromJSON(data: any): Produto {
    return Produto.create(
      data.id?.toString() || '',
      data.codigoProduto?.toString() || '',
      data.nome?.toString() || '',
      typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
      data.ativo === true || data.ativo === 'true',
      data.nomeGrupo?.toString(),
      data.estoque,
      data.favorito === true || data.favorito === 'true',
      data.abreComplementos === true || data.abreComplementos === 'true',
      data.permiteAcrescimo === true || data.permiteAcrescimo === 'true',
      data.permiteDesconto === true || data.permiteDesconto === 'true',
      Array.isArray(data.gruposComplementos)
        ? data.gruposComplementos.map((grupo: any) => ({
            id: grupo.id?.toString() || '',
            nome: grupo.nome?.toString() || '',
            complementos: Array.isArray(grupo.complementos)
              ? grupo.complementos.map((comp: any) => ({
                  id: comp.id?.toString() || '',
                  nome: comp.nome?.toString() || '',
                }))
              : [],
          }))
        : []
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

  isFavorito(): boolean {
    return this.favorito === true
  }

  abreComplementosAtivo(): boolean {
    return this.abreComplementos === true
  }

  permiteAcrescimoAtivo(): boolean {
    return this.permiteAcrescimo === true
  }

  permiteDescontoAtivo(): boolean {
    return this.permiteDesconto === true
  }

  getGruposComplementos(): ProdutoGrupoComplementoResumo[] {
    return this.gruposComplementos || []
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
      favorito: this.favorito,
      abreComplementos: this.abreComplementos,
      permiteAcrescimo: this.permiteAcrescimo,
      permiteDesconto: this.permiteDesconto,
      gruposComplementos: this.gruposComplementos,
    }
  }
}

