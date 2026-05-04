/**
 * Entidade de domínio representando um Perfil de Usuário PDV
 */
export class PerfilUsuario {
  private constructor(
    private readonly id: string,
    private readonly role: string,
    private readonly acessoMeiosPagamento: string[],
    private readonly cancelarVenda: boolean,
    private readonly cancelarProduto: boolean,
    private readonly aplicarDescontoProduto: boolean,
    private readonly aplicarDescontoVenda: boolean,
    private readonly aplicarAcrescimoProduto: boolean,
    private readonly aplicarAcrescimoVenda: boolean,
    private readonly removerProdutoLancado: boolean,
    private readonly removerPagamento: boolean,
    private readonly reimprimir: boolean,
    private readonly acessoVisaoGeral: boolean,
    private readonly acessoHistorico: boolean,
    private readonly acessoMesa: boolean,
    private readonly acessoBalcao: boolean,
    private readonly acessoConfiguracoes: boolean,
    private readonly crudCardapio: boolean,
    private readonly crudUsuario: boolean,
    private readonly crudCliente: boolean,
    private readonly encerrarCaixa: boolean,
    private readonly lancarTaxa: boolean,
    private readonly removerTaxa: boolean,
    private readonly removerLicenca: boolean
  ) {}

  static create(
    id: string,
    role: string,
    acessoMeiosPagamento: string[],
    cancelarVenda: boolean,
    cancelarProduto: boolean,
    aplicarDescontoProduto: boolean,
    aplicarDescontoVenda: boolean,
    aplicarAcrescimoProduto: boolean,
    aplicarAcrescimoVenda: boolean,
    removerProdutoLancado: boolean,
    removerPagamento: boolean,
    reimprimir: boolean,
    acessoVisaoGeral: boolean,
    acessoHistorico: boolean,
    acessoMesa: boolean,
    acessoBalcao: boolean,
    acessoConfiguracoes: boolean,
    crudCardapio: boolean,
    crudUsuario: boolean,
    crudCliente: boolean,
    encerrarCaixa: boolean,
    lancarTaxa: boolean,
    removerTaxa: boolean,
    removerLicenca: boolean
  ): PerfilUsuario {
    if (!id || !role) {
      throw new Error('ID e role são obrigatórios')
    }

    return new PerfilUsuario(
      id,
      role,
      acessoMeiosPagamento,
      cancelarVenda,
      cancelarProduto,
      aplicarDescontoProduto,
      aplicarDescontoVenda,
      aplicarAcrescimoProduto,
      aplicarAcrescimoVenda,
      removerProdutoLancado,
      removerPagamento,
      reimprimir,
      acessoVisaoGeral,
      acessoHistorico,
      acessoMesa,
      acessoBalcao,
      acessoConfiguracoes,
      crudCardapio,
      crudUsuario,
      crudCliente,
      encerrarCaixa,
      lancarTaxa,
      removerTaxa,
      removerLicenca
    )
  }

  static fromJSON(data: any): PerfilUsuario {
    return PerfilUsuario.create(
      data.id?.toString() || '',
      data.role?.toString() || '',
      Array.isArray(data.acessoMeiosPagamento)
        ? data.acessoMeiosPagamento.map((item: any) => item.toString())
        : [],
      data.cancelarVenda === true || data.cancelarVenda === 'true',
      data.cancelarProduto === true || data.cancelarProduto === 'true',
      data.aplicarDescontoProduto === true || data.aplicarDescontoProduto === 'true',
      data.aplicarDescontoVenda === true || data.aplicarDescontoVenda === 'true',
      data.aplicarAcrescimoProduto === true || data.aplicarAcrescimoProduto === 'true',
      data.aplicarAcrescimoVenda === true || data.aplicarAcrescimoVenda === 'true',
      data.removerProdutoLancado === true || data.removerProdutoLancado === 'true',
      data.removerPagamento === true || data.removerPagamento === 'true',
      data.reimprimir === true || data.reimprimir === 'true',
      data.acessoVisaoGeral === true || data.acessoVisaoGeral === 'true',
      data.acessoHistorico === true || data.acessoHistorico === 'true',
      data.acessoMesa === true || data.acessoMesa === 'true',
      data.acessoBalcao === true || data.acessoBalcao === 'true',
      data.acessoConfiguracoes === true || data.acessoConfiguracoes === 'true',
      data.crudCardapio === true || data.crudCardapio === 'true',
      data.crudUsuario === true || data.crudUsuario === 'true',
      data.crudCliente === true || data.crudCliente === 'true',
      data.encerrarCaixa === true || data.encerrarCaixa === 'true',
      data.lancarTaxa === true || data.lancarTaxa === 'true',
      data.removerTaxa === true || data.removerTaxa === 'true',
      data.removerLicenca === true || data.removerLicenca === 'true'
    )
  }

  getId(): string {
    return this.id
  }

  getRole(): string {
    return this.role
  }

  getAcessoMeiosPagamento(): string[] {
    return this.acessoMeiosPagamento
  }

  canCancelarVenda(): boolean {
    return this.cancelarVenda
  }

  canCancelarProduto(): boolean {
    return this.cancelarProduto
  }

  canAplicarDescontoProduto(): boolean {
    return this.aplicarDescontoProduto
  }

  canAplicarDescontoVenda(): boolean {
    return this.aplicarDescontoVenda
  }

  canAplicarAcrescimoProduto(): boolean {
    return this.aplicarAcrescimoProduto
  }

  canAplicarAcrescimoVenda(): boolean {
    return this.aplicarAcrescimoVenda
  }

  canRemoverProdutoLancado(): boolean {
    return this.removerProdutoLancado
  }

  canRemoverPagamento(): boolean {
    return this.removerPagamento
  }

  canReimprimir(): boolean {
    return this.reimprimir
  }

  canAcessoVisaoGeral(): boolean {
    return this.acessoVisaoGeral
  }

  canAcessoHistorico(): boolean {
    return this.acessoHistorico
  }

  canAcessoMesa(): boolean {
    return this.acessoMesa
  }

  canAcessoBalcao(): boolean {
    return this.acessoBalcao
  }

  canAcessoConfiguracoes(): boolean {
    return this.acessoConfiguracoes
  }

  canCrudCardapio(): boolean {
    return this.crudCardapio
  }

  canCrudUsuario(): boolean {
    return this.crudUsuario
  }

  canCrudCliente(): boolean {
    return this.crudCliente
  }

  canEncerrarCaixa(): boolean {
    return this.encerrarCaixa
  }

  canLancarTaxa(): boolean {
    return this.lancarTaxa
  }

  canRemoverTaxa(): boolean {
    return this.removerTaxa
  }

  canRemoverLicenca(): boolean {
    return this.removerLicenca
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      acessoMeiosPagamento: this.acessoMeiosPagamento,
      cancelarVenda: this.cancelarVenda,
      cancelarProduto: this.cancelarProduto,
      aplicarDescontoProduto: this.aplicarDescontoProduto,
      aplicarDescontoVenda: this.aplicarDescontoVenda,
      aplicarAcrescimoProduto: this.aplicarAcrescimoProduto,
      aplicarAcrescimoVenda: this.aplicarAcrescimoVenda,
      removerProdutoLancado: this.removerProdutoLancado,
      removerPagamento: this.removerPagamento,
      reimprimir: this.reimprimir,
      acessoVisaoGeral: this.acessoVisaoGeral,
      acessoHistorico: this.acessoHistorico,
      acessoMesa: this.acessoMesa,
      acessoBalcao: this.acessoBalcao,
      acessoConfiguracoes: this.acessoConfiguracoes,
      crudCardapio: this.crudCardapio,
      crudUsuario: this.crudUsuario,
      crudCliente: this.crudCliente,
      encerrarCaixa: this.encerrarCaixa,
      lancarTaxa: this.lancarTaxa,
      removerTaxa: this.removerTaxa,
      removerLicenca: this.removerLicenca,
    }
  }
}

