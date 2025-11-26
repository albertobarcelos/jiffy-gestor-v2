/**
 * Entidade representando um método de pagamento disponível na plataforma de delivery
 */
export class MetodoPagamento {
  constructor(
    public readonly id: number,
    public readonly nome: string,
    public readonly categoria: string,
    public readonly tag: string | null
  ) {}

  /**
   * Cria uma instância a partir de dados JSON
   */
  static fromJSON(data: {
    id: number
    nome: string
    categoria: string
    tag: string | null
  }): MetodoPagamento {
    return new MetodoPagamento(data.id, data.nome, data.categoria, data.tag)
  }

  /**
   * Converte para JSON
   */
  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      categoria: this.categoria,
      tag: this.tag,
    }
  }
}

