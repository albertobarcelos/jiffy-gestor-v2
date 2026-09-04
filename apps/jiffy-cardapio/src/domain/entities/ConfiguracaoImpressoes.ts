/**
 * Entidade de domínio representando Configurações de Impressões
 */
export class ConfiguracaoImpressoes {
  private constructor(
    private readonly cabecalho: string,
    private readonly rodape: string,
    private readonly impressaoDetalhada: boolean,
    private readonly ticketVenda: boolean,
    private readonly parcialEntrega: boolean,
    private readonly impressoraImpressoesCaixa: string,
    private readonly impressoraConferenciaVenda: string,
    private readonly impressoraRelatorios: string
  ) {}

  static create(data: {
    cabecalho?: string
    rodape?: string
    impressaoDetalhada?: boolean
    ticketVenda?: boolean
    parcialEntrega?: boolean
    impressoraImpressoesCaixa?: string
    impressoraConferenciaVenda?: string
    impressoraRelatorios?: string
  }): ConfiguracaoImpressoes {
    return new ConfiguracaoImpressoes(
      data.cabecalho ?? '',
      data.rodape ?? '',
      data.impressaoDetalhada ?? false,
      data.ticketVenda ?? false,
      data.parcialEntrega ?? false,
      data.impressoraImpressoesCaixa ?? '',
      data.impressoraConferenciaVenda ?? '',
      data.impressoraRelatorios ?? ''
    )
  }

  static fromJSON(data: any): ConfiguracaoImpressoes {
    return ConfiguracaoImpressoes.create({
      cabecalho: data.cabecalho,
      rodape: data.rodape,
      impressaoDetalhada: data.impressaoDetalhada,
      ticketVenda: data.ticketVenda,
      parcialEntrega: data.parcialEntrega,
      impressoraImpressoesCaixa: data.impressoraImpressoesCaixa,
      impressoraConferenciaVenda: data.impressoraConferenciaVenda,
      impressoraRelatorios: data.impressoraRelatorios,
    })
  }

  // Getters
  getCabecalho(): string { return this.cabecalho }
  getRodape(): string { return this.rodape }
  getImpressaoDetalhada(): boolean { return this.impressaoDetalhada }
  getTicketVenda(): boolean { return this.ticketVenda }
  getParcialEntrega(): boolean { return this.parcialEntrega }
  getImpressoraImpressoesCaixa(): string { return this.impressoraImpressoesCaixa }
  getImpressoraConferenciaVenda(): string { return this.impressoraConferenciaVenda }
  getImpressoraRelatorios(): string { return this.impressoraRelatorios }

  toJSON() {
    return {
      cabecalho: this.cabecalho,
      rodape: this.rodape,
      impressaoDetalhada: this.impressaoDetalhada,
      ticketVenda: this.ticketVenda,
      parcialEntrega: this.parcialEntrega,
      impressoraImpressoesCaixa: this.impressoraImpressoesCaixa,
      impressoraConferenciaVenda: this.impressoraConferenciaVenda,
      impressoraRelatorios: this.impressoraRelatorios,
    }
  }
}

