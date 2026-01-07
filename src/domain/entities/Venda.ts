/**
 * Entidade de domínio representando uma Venda
 */
export class Venda {
  private constructor(
    private readonly id: string,
    private readonly data: Date,
    private readonly numeroVenda: number,
    private readonly userId: string,
    private readonly tipoVenda: string,
    private readonly valorInicial: number,
    private readonly acrescimo: number,
    private readonly descontoConta: number,
    private readonly descontoItem: number,
    private readonly valorFaturado: number,
    private readonly metodoPagamento: string,
    private readonly status: 'Aprovada' | 'Cancelada'
  ) {}

  static create(
    id: string,
    data: Date,
    numeroVenda: number,
    userId: string,
    tipoVenda: string,
    valorInicial: number,
    acrescimo: number,
    descontoConta: number,
    descontoItem: number,
    valorFaturado: number,
    metodoPagamento: string,
    status: 'Aprovada' | 'Cancelada'
  ): Venda {
    if (!id || !data || numeroVenda <= 0 || !userId || !tipoVenda) {
      throw new Error('Campos obrigatórios não preenchidos')
    }

    return new Venda(
      id,
      data,
      numeroVenda,
      userId,
      tipoVenda,
      valorInicial,
      acrescimo,
      descontoConta,
      descontoItem,
      valorFaturado,
      metodoPagamento,
      status
    )
  }

  static fromJSON(data: any): Venda {
    return Venda.create(
      data.id?.toString() || '',
      data.data ? new Date(data.data) : new Date(),
      typeof data.numeroVenda === 'number' ? data.numeroVenda : parseInt(data.numeroVenda) || 0,
      data.userId?.toString() || '',
      data.tipoVenda?.toString() || '',
      typeof data.valorInicial === 'number' ? data.valorInicial : parseFloat(data.valorInicial) || 0,
      typeof data.acrescimo === 'number' ? data.acrescimo : parseFloat(data.acrescimo) || 0,
      typeof data.descontoConta === 'number' ? data.descontoConta : parseFloat(data.descontoConta) || 0,
      typeof data.descontoItem === 'number' ? data.descontoItem : parseFloat(data.descontoItem) || 0,
      typeof data.valorFaturado === 'number' ? data.valorFaturado : parseFloat(data.valorFaturado) || 0,
      data.metodoPagamento?.toString() || '',
      data.status === 'Aprovada' || data.status === 'Cancelada' ? data.status : 'Aprovada'
    )
  }

  getId(): string {
    return this.id
  }

  getData(): Date {
    return this.data
  }

  getNumeroVenda(): number {
    return this.numeroVenda
  }

  getUserId(): string {
    return this.userId
  }

  getTipoVenda(): string {
    return this.tipoVenda
  }

  getValorInicial(): number {
    return this.valorInicial
  }

  getAcrescimo(): number {
    return this.acrescimo
  }

  getDescontoConta(): number {
    return this.descontoConta
  }

  getDescontoItem(): number {
    return this.descontoItem
  }

  getValorFaturado(): number {
    return this.valorFaturado
  }

  getMetodoPagamento(): string {
    return this.metodoPagamento
  }

  getStatus(): 'Aprovada' | 'Cancelada' {
    return this.status
  }

  isAprovada(): boolean {
    return this.status === 'Aprovada'
  }

  isCancelada(): boolean {
    return this.status === 'Cancelada'
  }

  getTotalDescontos(): number {
    return this.descontoConta + this.descontoItem
  }

  toJSON() {
    return {
      id: this.id,
      data: this.data.toISOString(),
      numeroVenda: this.numeroVenda,
      userId: this.userId,
      tipoVenda: this.tipoVenda,
      valorInicial: this.valorInicial,
      acrescimo: this.acrescimo,
      descontoConta: this.descontoConta,
      descontoItem: this.descontoItem,
      valorFaturado: this.valorFaturado,
      metodoPagamento: this.metodoPagamento,
      status: this.status,
    }
  }
}

