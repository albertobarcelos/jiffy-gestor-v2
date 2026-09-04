/**
 * Entidade de domínio representando um Perfil de Gestor
 */
export class PerfilGestor {
  private constructor(
    private readonly id: string,
    private readonly role: string,
    private readonly acessoFinanceiro: boolean,
    private readonly acessoEstoque: boolean,
    private readonly acessoFiscal: boolean,
    private readonly acessoDashboard: boolean
  ) {}

  static create(
    id: string,
    role: string,
    acessoFinanceiro: boolean,
    acessoEstoque: boolean,
    acessoFiscal: boolean,
    acessoDashboard: boolean
  ): PerfilGestor {
    if (!id || !role) {
      throw new Error('ID e role são obrigatórios')
    }

    return new PerfilGestor(
      id,
      role,
      acessoFinanceiro,
      acessoEstoque,
      acessoFiscal,
      acessoDashboard
    )
  }

  static fromJSON(data: any): PerfilGestor {
    return PerfilGestor.create(
      data.id?.toString() || '',
      data.role?.toString() || '',
      data.acessoFinanceiro === true || data.acessoFinanceiro === 'true',
      data.acessoEstoque === true || data.acessoEstoque === 'true',
      data.acessoFiscal === true || data.acessoFiscal === 'true',
      data.acessoDashboard === true || data.acessoDashboard === 'true'
    )
  }

  getId(): string {
    return this.id
  }

  getRole(): string {
    return this.role
  }

  hasAcessoFinanceiro(): boolean {
    return this.acessoFinanceiro
  }

  hasAcessoEstoque(): boolean {
    return this.acessoEstoque
  }

  hasAcessoFiscal(): boolean {
    return this.acessoFiscal
  }

  hasAcessoDashboard(): boolean {
    return this.acessoDashboard
  }

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      acessoFinanceiro: this.acessoFinanceiro,
      acessoEstoque: this.acessoEstoque,
      acessoFiscal: this.acessoFiscal,
      acessoDashboard: this.acessoDashboard,
    }
  }
}
