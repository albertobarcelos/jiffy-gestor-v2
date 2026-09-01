/**
 * Entidade de domínio para Grupo de Produtos
 * Replica a estrutura do Flutter
 */
export class GrupoProduto {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly corHex: string,
    private readonly iconName: string,
    private readonly ativo: boolean,
    private readonly ativoDelivery: boolean,
    private readonly ativoLocal: boolean,
    private readonly ordem?: number
  ) {}

  static create(params: {
    id: string
    nome: string
    corHex: string
    iconName: string
    ativo: boolean
    ativoDelivery: boolean
    ativoLocal: boolean
    ordem?: number
  }): GrupoProduto {
    return new GrupoProduto(
      params.id,
      params.nome,
      params.corHex,
      params.iconName,
      params.ativo,
      params.ativoDelivery,
      params.ativoLocal,
      params.ordem
    )
  }

  static fromJSON(json: any): GrupoProduto {
    return new GrupoProduto(
      json.id || '',
      json.nome || '',
      json.corHex || '#CCCCCC',
      json.iconName || '',
      json.ativo ?? true,
      json.ativoDelivery ?? false,
      json.ativoLocal ?? false,
      json.ordem
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getCorHex(): string {
    return this.corHex
  }

  getIconName(): string {
    return this.iconName
  }

  isAtivo(): boolean {
    return this.ativo
  }

  isAtivoDelivery(): boolean {
    return this.ativoDelivery
  }

  isAtivoLocal(): boolean {
    return this.ativoLocal
  }

  getOrdem(): number | undefined {
    return this.ordem
  }

  toJSON(): any {
    return {
      id: this.id,
      nome: this.nome,
      corHex: this.corHex,
      iconName: this.iconName,
      ativo: this.ativo,
      ativoDelivery: this.ativoDelivery,
      ativoLocal: this.ativoLocal,
      ordem: this.ordem,
    }
  }
}

