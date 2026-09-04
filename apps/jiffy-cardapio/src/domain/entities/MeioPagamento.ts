export type TipoParcelamento = 'jurosVendedor' | 'jurosCliente'

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
    private readonly tipoParcelamento: TipoParcelamento | null
  ) {}

  static create(
    id: string,
    nome: string,
    tefAtivo: boolean,
    formaPagamentoFiscal: string,
    ativo: boolean,
    isParcelavel: boolean,
    tipoParcelamento: TipoParcelamento | null
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
      tipoParcelamento
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
      data.tefAtivo === true || data.tefAtivo === 'true',
      data.formaPagamentoFiscal?.toString() || 'Dinheiro',
      data.ativo === true || data.ativo === 'true',
      data.isParcelavel === true || data.isParcelavel === 'true',
      tipoParcelamento
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
      formaPagamentoFiscal: this.formaPagamentoFiscal,
      ativo: this.ativo,
      isParcelavel: this.parcelavel,
      tipoParcelamento: this.tipoParcelamento,
    }
  }
}

