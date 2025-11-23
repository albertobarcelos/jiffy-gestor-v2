/**
 * Entidade de domínio representando um Caixa
 */
export interface Terminal {
  id: string
  nome: string
}

export interface ConferenciaCaixa {
  id: string
  status: string
  valorCorreto: number
  valorInformado: number
  dataConferencia?: Date
  metodoPagamentoId?: string[]
  realizadoPorId?: string
  realizadoPorNome?: string
}

export class Caixa {
  private constructor(
    private readonly id: string,
    private readonly status: 'Aberto' | 'Fechado',
    private readonly dataAbertura: Date,
    private readonly dataFechamento?: Date,
    private readonly fechadoPorId?: string,
    private readonly fechadoPorNome?: string,
    private readonly dataCriacao?: Date,
    private readonly dataAtualizacao?: Date,
    private readonly conferenciaCaixa?: ConferenciaCaixa,
    private readonly terminais: Terminal[] = []
  ) {}

  static create(
    id: string,
    status: 'Aberto' | 'Fechado',
    dataAbertura: Date,
    dataFechamento?: Date,
    fechadoPorId?: string,
    fechadoPorNome?: string,
    dataCriacao?: Date,
    dataAtualizacao?: Date,
    conferenciaCaixa?: ConferenciaCaixa,
    terminais: Terminal[] = []
  ): Caixa {
    if (!id || !status || !dataAbertura) {
      throw new Error('ID, status e data de abertura são obrigatórios')
    }

    return new Caixa(
      id,
      status,
      dataAbertura,
      dataFechamento,
      fechadoPorId,
      fechadoPorNome,
      dataCriacao,
      dataAtualizacao,
      conferenciaCaixa,
      terminais
    )
  }

  static fromJSON(data: any): Caixa {
    return Caixa.create(
      data.id?.toString() || '',
      data.status === 'Aberto' || data.status === 'Fechado' ? data.status : 'Fechado',
      data.dataAbertura ? new Date(data.dataAbertura) : new Date(),
      data.dataFechamento ? new Date(data.dataFechamento) : undefined,
      data.fechadoPor?.id?.toString(),
      data.fechadoPor?.nome?.toString(),
      data.dataCriacao ? new Date(data.dataCriacao) : undefined,
      data.dataAtualizacao ? new Date(data.dataAtualizacao) : undefined,
      data.conferenciaCaixa ? {
        id: data.conferenciaCaixa.id?.toString() || '',
        status: data.conferenciaCaixa.status?.toString() || '',
        valorCorreto: typeof data.conferenciaCaixa.valorCorreto === 'number' ? data.conferenciaCaixa.valorCorreto : parseFloat(data.conferenciaCaixa.valorCorreto) || 0,
        valorInformado: typeof data.conferenciaCaixa.valorInformado === 'number' ? data.conferenciaCaixa.valorInformado : parseFloat(data.conferenciaCaixa.valorInformado) || 0,
        dataConferencia: data.conferenciaCaixa.dataConferencia ? new Date(data.conferenciaCaixa.dataConferencia) : undefined,
        metodoPagamentoId: data.conferenciaCaixa.metodoPagamentoId?.map((id: any) => id.toString()),
        realizadoPorId: data.conferenciaCaixa.realizadoPor?.id?.toString(),
        realizadoPorNome: data.conferenciaCaixa.realizadoPor?.nome?.toString(),
      } : undefined,
      (data.terminais || []).map((t: any) => ({
        id: t.id?.toString() || '',
        nome: t.nome?.toString() || '',
      }))
    )
  }

  getId(): string {
    return this.id
  }

  getStatus(): 'Aberto' | 'Fechado' {
    return this.status
  }

  getDataAbertura(): Date {
    return this.dataAbertura
  }

  getDataFechamento(): Date | undefined {
    return this.dataFechamento
  }

  getFechadoPorId(): string | undefined {
    return this.fechadoPorId
  }

  getFechadoPorNome(): string | undefined {
    return this.fechadoPorNome
  }

  getDataCriacao(): Date | undefined {
    return this.dataCriacao
  }

  getDataAtualizacao(): Date | undefined {
    return this.dataAtualizacao
  }

  getConferenciaCaixa(): ConferenciaCaixa | undefined {
    return this.conferenciaCaixa
  }

  getTerminais(): Terminal[] {
    return this.terminais
  }

  isAberto(): boolean {
    return this.status === 'Aberto'
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      dataAbertura: this.dataAbertura.toISOString(),
      dataFechamento: this.dataFechamento?.toISOString(),
      fechadoPorId: this.fechadoPorId,
      fechadoPorNome: this.fechadoPorNome,
      dataCriacao: this.dataCriacao?.toISOString(),
      dataAtualizacao: this.dataAtualizacao?.toISOString(),
      conferenciaCaixa: this.conferenciaCaixa,
      terminais: this.terminais,
    }
  }
}

