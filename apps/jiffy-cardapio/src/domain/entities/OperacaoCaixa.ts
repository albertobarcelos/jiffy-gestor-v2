/**
 * Entidade de domínio representando uma Operação de Caixa (Sangria ou Suprimento)
 */
export class OperacaoCaixa {
  private constructor(
    private readonly id: string,
    private readonly tipo: 'SANGRIA' | 'SUPRIMENTO',
    private readonly valor: number,
    private readonly descricao: string,
    private readonly dataCriacao: Date,
    private readonly caixaId: string
  ) {}

  static create(
    id: string,
    tipo: 'SANGRIA' | 'SUPRIMENTO',
    valor: number,
    descricao: string,
    dataCriacao: Date,
    caixaId: string
  ): OperacaoCaixa {
    if (!id || !tipo || valor <= 0 || !descricao || !caixaId) {
      throw new Error('Todos os campos são obrigatórios e valor deve ser maior que zero')
    }

    return new OperacaoCaixa(id, tipo, valor, descricao, dataCriacao, caixaId)
  }

  static fromJSON(data: any): OperacaoCaixa {
    return OperacaoCaixa.create(
      data.id?.toString() || '',
      data.tipo === 'SANGRIA' || data.tipo === 'SUPRIMENTO' ? data.tipo : 'SANGRIA',
      typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
      data.descricao?.toString() || '',
      data.dataCriacao || data.data_criacao ? new Date(data.dataCriacao || data.data_criacao) : new Date(),
      data.caixaId?.toString() || data.caixa_id?.toString() || ''
    )
  }

  getId(): string {
    return this.id
  }

  getTipo(): 'SANGRIA' | 'SUPRIMENTO' {
    return this.tipo
  }

  getValor(): number {
    return this.valor
  }

  getDescricao(): string {
    return this.descricao
  }

  getDataCriacao(): Date {
    return this.dataCriacao
  }

  getCaixaId(): string {
    return this.caixaId
  }

  isSangria(): boolean {
    return this.tipo === 'SANGRIA'
  }

  isSuprimento(): boolean {
    return this.tipo === 'SUPRIMENTO'
  }

  toJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      valor: this.valor,
      descricao: this.descricao,
      dataCriacao: this.dataCriacao.toISOString(),
      caixaId: this.caixaId,
    }
  }
}

