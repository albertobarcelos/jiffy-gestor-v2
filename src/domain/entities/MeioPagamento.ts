export type TipoParcelamento = 'jurosVendedor' | 'jurosCliente'

function parseBooleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/**
 * Entidade de domínio representando um Meio de Pagamento
 */
export class MeioPagamento {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly tefAtivo: boolean,
    private readonly formaPagamentoFiscal: string,
    private readonly ativo: boolean,
    private readonly parcelavel: boolean,
    private readonly tipoParcelamento: TipoParcelamento | null,
    private readonly isDeliveryFlag: boolean
  ) {}

  static create(
    id: string,
    nome: string,
    tefAtivo: boolean,
    formaPagamentoFiscal: string,
    ativo: boolean,
    isParcelavel: boolean,
    tipoParcelamento: TipoParcelamento | null,
    isDelivery = false
  ): MeioPagamento {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new MeioPagamento(
      id,
      nome,
      tefAtivo,
      formaPagamentoFiscal,
      ativo,
      isParcelavel,
      tipoParcelamento,
      isDelivery
    )
  }

  static fromJSON(data: any): MeioPagamento {
    const tipoParcelamentoRaw = data.tipoParcelamento?.toString()?.trim()
    let tipoParcelamento: TipoParcelamento | null = null
    if (tipoParcelamentoRaw === 'jurosCliente') {
      tipoParcelamento = 'jurosCliente'
    } else if (tipoParcelamentoRaw === 'jurosVendedor') {
      tipoParcelamento = 'jurosVendedor'
    }

    return MeioPagamento.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      parseBooleanFlag(data.tefAtivo),
      data.formaPagamentoFiscal?.toString() || 'Dinheiro',
      parseBooleanFlag(data.ativo),
      parseBooleanFlag(data.isParcelavel),
      tipoParcelamento,
      parseBooleanFlag(data.isDelivery)
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  isTefAtivo(): boolean {
    return this.tefAtivo
  }

  isDelivery(): boolean {
    return this.isDeliveryFlag
  }

  getFormaPagamentoFiscal(): string {
    return this.formaPagamentoFiscal
  }

  isAtivo(): boolean {
    return this.ativo
  }

  isParcelavel(): boolean {
    return this.parcelavel
  }

  getTipoParcelamento(): TipoParcelamento | null {
    return this.tipoParcelamento
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      tefAtivo: this.tefAtivo,
      isDelivery: this.isDeliveryFlag,
      formaPagamentoFiscal: this.formaPagamentoFiscal,
      ativo: this.ativo,
      isParcelavel: this.parcelavel,
      tipoParcelamento: this.tipoParcelamento,
    }
  }
}
