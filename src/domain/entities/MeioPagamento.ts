import { resolverFlagsCanalDelivery } from '@/src/domain/policies/pagamento/resolverFlagsCanalDelivery'

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
    private readonly ativoEntregaDelivery: boolean,
    private readonly ativoRetiradaDelivery: boolean
  ) {}

  static create(
    id: string,
    nome: string,
    tefAtivo: boolean,
    formaPagamentoFiscal: string,
    ativo: boolean,
    isParcelavel: boolean,
    tipoParcelamento: TipoParcelamento | null,
    ativoEntregaDelivery = false,
    ativoRetiradaDelivery = false
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
      ativoEntregaDelivery,
      ativoRetiradaDelivery
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

    const canais = resolverFlagsCanalDelivery(data)
    return MeioPagamento.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      parseBooleanFlag(data.tefAtivo),
      data.formaPagamentoFiscal?.toString() || 'Dinheiro',
      parseBooleanFlag(data.ativo),
      parseBooleanFlag(data.isParcelavel),
      tipoParcelamento,
      canais.ativoEntregaDelivery,
      canais.ativoRetiradaDelivery
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
    return this.ativoEntregaDelivery || this.ativoRetiradaDelivery
  }

  isEntregaDelivery(): boolean {
    return this.ativoEntregaDelivery
  }

  isRetiradaDelivery(): boolean {
    return this.ativoRetiradaDelivery
  }

  disponivelParaTipoEntrega(tipo: 'entrega' | 'retirada'): boolean {
    return tipo === 'entrega' ? this.ativoEntregaDelivery : this.ativoRetiradaDelivery
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
      ativoEntregaDelivery: this.ativoEntregaDelivery,
      ativoRetiradaDelivery: this.ativoRetiradaDelivery,
      ativoDelivery: this.ativoEntregaDelivery || this.ativoRetiradaDelivery,
      formaPagamentoFiscal: this.formaPagamentoFiscal,
      ativo: this.ativo,
      isParcelavel: this.parcelavel,
      tipoParcelamento: this.tipoParcelamento,
    }
  }
}
