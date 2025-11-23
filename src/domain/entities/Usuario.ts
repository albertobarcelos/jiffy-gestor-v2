/**
 * Entidade de domínio representando um Usuário PDV
 */
export class Usuario {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly telefone?: string,
    private readonly ativo: boolean = true,
    private readonly perfilPdvId?: string,
    private readonly perfilPdv?: any
  ) {}

  static create(
    id: string,
    nome: string,
    telefone?: string,
    ativo: boolean = true,
    perfilPdvId?: string,
    perfilPdv?: any
  ): Usuario {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Usuario(id, nome, telefone, ativo, perfilPdvId, perfilPdv)
  }

  static fromJSON(data: any): Usuario {
    return Usuario.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      data.telefone?.toString(),
      data.ativo === true || data.ativo === 'true',
      data.perfilPdvId?.toString(),
      data.perfilPdv
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getTelefone(): string | undefined {
    return this.telefone
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getPerfilPdvId(): string | undefined {
    return this.perfilPdvId
  }

  getPerfilPdv(): any | undefined {
    return this.perfilPdv
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      telefone: this.telefone,
      ativo: this.ativo,
      perfilPdvId: this.perfilPdvId,
      perfilPdv: this.perfilPdv,
    }
  }
}

