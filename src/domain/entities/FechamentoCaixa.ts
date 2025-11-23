/**
 * Entidade de domínio representando um Fechamento de Caixa
 */
export class FechamentoCaixa {
  private constructor(
    private readonly id: string,
    private readonly caixaId: string,
    private readonly dataFechamento: Date,
    private readonly valorTotal: number,
    private readonly valorEsperado: number,
    private readonly diferenca: number,
    private readonly fechadoPorId: string,
    private readonly fechadoPorNome: string,
    private readonly observacoes?: string
  ) {}

  static create(
    id: string,
    caixaId: string,
    dataFechamento: Date,
    valorTotal: number,
    valorEsperado: number,
    fechadoPorId: string,
    fechadoPorNome: string,
    observacoes?: string
  ): FechamentoCaixa {
    if (!id || !caixaId || !dataFechamento || !fechadoPorId) {
      throw new Error('ID, caixaId, data de fechamento e fechadoPor são obrigatórios')
    }

    const diferenca = valorTotal - valorEsperado

    return new FechamentoCaixa(
      id,
      caixaId,
      dataFechamento,
      valorTotal,
      valorEsperado,
      diferenca,
      fechadoPorId,
      fechadoPorNome,
      observacoes
    )
  }

  static fromJSON(data: any): FechamentoCaixa {
    const valorTotal = typeof data.valorTotal === 'number' ? data.valorTotal : parseFloat(data.valorTotal) || 0
    const valorEsperado = typeof data.valorEsperado === 'number' ? data.valorEsperado : parseFloat(data.valorEsperado) || 0

    return FechamentoCaixa.create(
      data.id?.toString() || '',
      data.caixaId?.toString() || '',
      data.dataFechamento ? new Date(data.dataFechamento) : new Date(),
      valorTotal,
      valorEsperado,
      data.fechadoPor?.id?.toString() || '',
      data.fechadoPor?.nome?.toString() || '',
      data.observacoes?.toString()
    )
  }

  getId(): string {
    return this.id
  }

  getCaixaId(): string {
    return this.caixaId
  }

  getDataFechamento(): Date {
    return this.dataFechamento
  }

  getValorTotal(): number {
    return this.valorTotal
  }

  getValorEsperado(): number {
    return this.valorEsperado
  }

  getDiferenca(): number {
    return this.diferenca
  }

  getFechadoPorId(): string {
    return this.fechadoPorId
  }

  getFechadoPorNome(): string {
    return this.fechadoPorNome
  }

  getObservacoes(): string | undefined {
    return this.observacoes
  }

  temDiferenca(): boolean {
    return Math.abs(this.diferenca) > 0.01
  }

  toJSON() {
    return {
      id: this.id,
      caixaId: this.caixaId,
      dataFechamento: this.dataFechamento.toISOString(),
      valorTotal: this.valorTotal,
      valorEsperado: this.valorEsperado,
      diferenca: this.diferenca,
      fechadoPorId: this.fechadoPorId,
      fechadoPorNome: this.fechadoPorNome,
      observacoes: this.observacoes,
    }
  }
}

