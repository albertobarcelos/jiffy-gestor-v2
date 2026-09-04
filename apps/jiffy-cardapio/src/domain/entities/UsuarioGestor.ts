/**
 * Entidade de domínio representando um Usuário Gestor
 */
export class UsuarioGestor {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly username: string,
    private readonly ativo: boolean,
    private readonly perfilGestorId?: string,
    private readonly perfilGestor?: any,
    private readonly modulosAcesso?: string[],
    private readonly empresaId?: string
  ) {}

  static create(
    id: string,
    nome: string,
    username: string,
    ativo: boolean = true,
    perfilGestorId?: string,
    perfilGestor?: any,
    modulosAcesso?: string[],
    empresaId?: string
  ): UsuarioGestor {
    // Apenas ID é obrigatório para criação (para listagem, outros campos podem ter valores padrão)
    if (!id) {
      throw new Error('ID é obrigatório para criar UsuarioGestor')
    }

    return new UsuarioGestor(
      id,
      nome,
      username,
      ativo,
      perfilGestorId,
      perfilGestor,
      modulosAcesso,
      empresaId
    )
  }

  static fromJSON(data: any): UsuarioGestor {
    // Extrai perfilGestorId do objeto perfilGestor se não vier diretamente
    const perfilGestorId = 
      data.perfilGestorId?.toString() || 
      data.perfilGestor?.id?.toString() || 
      undefined

    // Trata os campos, garantindo que sejam strings válidas
    // Para listagem, permite valores vazios ou padrão
    const id = data.id ? String(data.id).trim() : ''
    const nome = data.nome ? String(data.nome).trim() : 'Sem nome'
    // Trata username: se vier vazio, null, undefined ou a string 'VAZIO', usa valor padrão
    const usernameRaw = data.username
    const username = (usernameRaw && 
                      String(usernameRaw).trim() !== '' && 
                      String(usernameRaw).trim().toUpperCase() !== 'VAZIO') 
                      ? String(usernameRaw).trim() 
                      : 'Sem username'

    // Valida apenas o ID que é realmente obrigatório
    if (!id) {
      console.error('❌ [UsuarioGestor.fromJSON] ID obrigatório faltando:', {
        dataCompleto: data
      })
      throw new Error(`ID é obrigatório para criar UsuarioGestor`)
    }

    return UsuarioGestor.create(
      id,
      nome,
      username,
      data.ativo === true || data.ativo === 'true',
      perfilGestorId,
      data.perfilGestor,
      Array.isArray(data.modulosAcesso) ? data.modulosAcesso : [],
      data.empresaId?.toString()
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getUsername(): string {
    return this.username
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getPerfilGestorId(): string | undefined {
    return this.perfilGestorId
  }

  getPerfilGestor(): any | undefined {
    return this.perfilGestor
  }

  getModulosAcesso(): string[] {
    return this.modulosAcesso || []
  }

  getEmpresaId(): string | undefined {
    return this.empresaId
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      username: this.username,
      ativo: this.ativo,
      perfilGestorId: this.perfilGestorId,
      perfilGestor: this.perfilGestor,
      modulosAcesso: this.modulosAcesso,
      empresaId: this.empresaId,
    }
  }
}
