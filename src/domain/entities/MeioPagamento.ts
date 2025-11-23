/**
 * Entidade de domínio representando um Meio de Pagamento
 */
export class MeioPagamento {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly tefAtivo: boolean,
    private readonly formaPagamentoFiscal: string,
    private readonly ativo: boolean
  ) {}

  static create(
    id: string,
    nome: string,
    tefAtivo: boolean,
    formaPagamentoFiscal: string,
    ativo: boolean
  ): MeioPagamento {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new MeioPagamento(id, nome, tefAtivo, formaPagamentoFiscal, ativo)
  }

  static fromJSON(data: any): MeioPagamento {
    return MeioPagamento.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      data.tefAtivo === true || data.tefAtivo === 'true',
      data.formaPagamentoFiscal?.toString() || 'Dinheiro',
      data.ativo === true || data.ativo === 'true'
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

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      tefAtivo: this.tefAtivo,
      formaPagamentoFiscal: this.formaPagamentoFiscal,
      ativo: this.ativo,
    }
  }
}

