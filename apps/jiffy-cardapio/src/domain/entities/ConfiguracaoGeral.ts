/**
 * Entidade de domínio representando Configurações Gerais de Vendas PDV
 */
export class ConfiguracaoGeral {
  private constructor(
    private readonly identificacaoComandaMesa: boolean,
    private readonly observacaoBalcao: boolean,
    private readonly valorAcrescimo: number,
    private readonly acrescimoBalcao: boolean,
    private readonly acrescimoMesa: boolean,
    private readonly acrescimoDelivery: boolean,
    private readonly valorDesconto: number,
    private readonly descontoBalcao: boolean,
    private readonly descontoMesa: boolean,
    private readonly descontoDelivery: boolean,
    private readonly imagemCabecalho: string,
    private readonly recebimentoParcial: boolean,
    private readonly juntaFicha: boolean,
    private readonly rateiaConta: boolean,
    private readonly pedeLugaresMesa: boolean,
    private readonly horarioCorteAcerto: string,
    private readonly descricaoLugarMesa: string,
    private readonly idioma: string,
    private readonly tributos: string,
    private readonly identificacaoAcrescimoCupom: string,
    private readonly descontoIncideNoAcrescimo: boolean,
    private readonly tipoAcrescimo: string,
    private readonly permiteRepique: boolean,
    private readonly tipoRelatorioFechamento: string
  ) {}

  static create(data: {
    identificacaoComandaMesa?: boolean
    observacaoBalcao?: boolean
    valorAcrescimo?: number
    acrescimoBalcao?: boolean
    acrescimoMesa?: boolean
    acrescimoDelivery?: boolean
    valorDesconto?: number
    descontoBalcao?: boolean
    descontoMesa?: boolean
    descontoDelivery?: boolean
    imagemCabecalho?: string
    recebimentoParcial?: boolean
    juntaFicha?: boolean
    rateiaConta?: boolean
    pedeLugaresMesa?: boolean
    horarioCorteAcerto?: string
    descricaoLugarMesa?: string
    idioma?: string
    tributos?: string
    identificacaoAcrescimoCupom?: string
    descontoIncideNoAcrescimo?: boolean
    tipoAcrescimo?: string
    permiteRepique?: boolean
    tipoRelatorioFechamento?: string
  }): ConfiguracaoGeral {
    return new ConfiguracaoGeral(
      data.identificacaoComandaMesa ?? false,
      data.observacaoBalcao ?? false,
      data.valorAcrescimo ?? 0,
      data.acrescimoBalcao ?? false,
      data.acrescimoMesa ?? false,
      data.acrescimoDelivery ?? false,
      data.valorDesconto ?? 0,
      data.descontoBalcao ?? false,
      data.descontoMesa ?? false,
      data.descontoDelivery ?? false,
      data.imagemCabecalho ?? '',
      data.recebimentoParcial ?? false,
      data.juntaFicha ?? false,
      data.rateiaConta ?? false,
      data.pedeLugaresMesa ?? false,
      data.horarioCorteAcerto ?? '00:00',
      data.descricaoLugarMesa ?? '',
      data.idioma ?? 'Português',
      data.tributos ?? 'Brasil',
      data.identificacaoAcrescimoCupom ?? '',
      data.descontoIncideNoAcrescimo ?? false,
      data.tipoAcrescimo ?? 'Geral',
      data.permiteRepique ?? false,
      data.tipoRelatorioFechamento ?? 'Resumido'
    )
  }

  static fromJSON(data: any): ConfiguracaoGeral {
    return ConfiguracaoGeral.create({
      identificacaoComandaMesa: data.identificacaoComandaMesa,
      observacaoBalcao: data.observacaoBalcao,
      valorAcrescimo: typeof data.valorAcrescimo === 'number' ? data.valorAcrescimo : parseFloat(data.valorAcrescimo) || 0,
      acrescimoBalcao: data.acrescimoBalcao,
      acrescimoMesa: data.acrescimoMesa,
      acrescimoDelivery: data.acrescimoDelivery,
      valorDesconto: typeof data.valorDesconto === 'number' ? data.valorDesconto : parseFloat(data.valorDesconto) || 0,
      descontoBalcao: data.descontoBalcao,
      descontoMesa: data.descontoMesa,
      descontoDelivery: data.descontoDelivery,
      imagemCabecalho: data.imagemCabecalho,
      recebimentoParcial: data.recebimentoParcial,
      juntaFicha: data.juntaFicha,
      rateiaConta: data.rateiaConta,
      pedeLugaresMesa: data.pedeLugaresMesa,
      horarioCorteAcerto: data.horarioCorteAcerto,
      descricaoLugarMesa: data.descricaoLugarMesa,
      idioma: data.idioma,
      tributos: data.tributos,
      identificacaoAcrescimoCupom: data.identificacaoAcrescimoCupom,
      descontoIncideNoAcrescimo: data.descontoIncideNoAcrescimo,
      tipoAcrescimo: data.tipoAcrescimo,
      permiteRepique: data.permiteRepique,
      tipoRelatorioFechamento: data.tipoRelatorioFechamento,
    })
  }

  // Getters
  getIdentificacaoComandaMesa(): boolean { return this.identificacaoComandaMesa }
  getObservacaoBalcao(): boolean { return this.observacaoBalcao }
  getValorAcrescimo(): number { return this.valorAcrescimo }
  getAcrescimoBalcao(): boolean { return this.acrescimoBalcao }
  getAcrescimoMesa(): boolean { return this.acrescimoMesa }
  getAcrescimoDelivery(): boolean { return this.acrescimoDelivery }
  getValorDesconto(): number { return this.valorDesconto }
  getDescontoBalcao(): boolean { return this.descontoBalcao }
  getDescontoMesa(): boolean { return this.descontoMesa }
  getDescontoDelivery(): boolean { return this.descontoDelivery }
  getImagemCabecalho(): string { return this.imagemCabecalho }
  getRecebimentoParcial(): boolean { return this.recebimentoParcial }
  getJuntaFicha(): boolean { return this.juntaFicha }
  getRateiaConta(): boolean { return this.rateiaConta }
  getPedeLugaresMesa(): boolean { return this.pedeLugaresMesa }
  getHorarioCorteAcerto(): string { return this.horarioCorteAcerto }
  getDescricaoLugarMesa(): string { return this.descricaoLugarMesa }
  getIdioma(): string { return this.idioma }
  getTributos(): string { return this.tributos }
  getIdentificacaoAcrescimoCupom(): string { return this.identificacaoAcrescimoCupom }
  getDescontoIncideNoAcrescimo(): boolean { return this.descontoIncideNoAcrescimo }
  getTipoAcrescimo(): string { return this.tipoAcrescimo }
  getPermiteRepique(): boolean { return this.permiteRepique }
  getTipoRelatorioFechamento(): string { return this.tipoRelatorioFechamento }

  toJSON() {
    return {
      identificacaoComandaMesa: this.identificacaoComandaMesa,
      observacaoBalcao: this.observacaoBalcao,
      valorAcrescimo: this.valorAcrescimo,
      acrescimoBalcao: this.acrescimoBalcao,
      acrescimoMesa: this.acrescimoMesa,
      acrescimoDelivery: this.acrescimoDelivery,
      valorDesconto: this.valorDesconto,
      descontoBalcao: this.descontoBalcao,
      descontoMesa: this.descontoMesa,
      descontoDelivery: this.descontoDelivery,
      imagemCabecalho: this.imagemCabecalho,
      recebimentoParcial: this.recebimentoParcial,
      juntaFicha: this.juntaFicha,
      rateiaConta: this.rateiaConta,
      pedeLugaresMesa: this.pedeLugaresMesa,
      horarioCorteAcerto: this.horarioCorteAcerto,
      descricaoLugarMesa: this.descricaoLugarMesa,
      idioma: this.idioma,
      tributos: this.tributos,
      identificacaoAcrescimoCupom: this.identificacaoAcrescimoCupom,
      descontoIncideNoAcrescimo: this.descontoIncideNoAcrescimo,
      tipoAcrescimo: this.tipoAcrescimo,
      permiteRepique: this.permiteRepique,
      tipoRelatorioFechamento: this.tipoRelatorioFechamento,
    }
  }
}

