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
    private readonly aplicarAcrescimoVenda: boolean
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
    aplicarAcrescimoVenda: boolean
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
      aplicarAcrescimoVenda
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
      data.aplicarAcrescimoVenda === true || data.aplicarAcrescimoVenda === 'true'
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
    }
  }
}

