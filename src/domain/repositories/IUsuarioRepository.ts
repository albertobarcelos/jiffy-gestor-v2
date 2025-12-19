import { Usuario } from '../entities/Usuario'

export interface BuscarUsuariosParams {
  limit: number
  offset: number
  q?: string
  perfilPdvId?: string
  name?: string
  ativo?: boolean | null
}

export interface CriarUsuarioDTO {
  id?: string // ID é opcional na criação (gerado pelo backend)
  nome: string
  telefone?: string
  ativo?: boolean
  password?: string
  perfilPdvId?: string
}

export interface AtualizarUsuarioDTO {
  nome?: string
  telefone?: string
  ativo?: boolean
  password?: string
  perfilPdvId?: string
}

/**
 * Interface do repositório de usuários
 */
export interface IUsuarioRepository {
  buscarUsuarios(params: BuscarUsuariosParams): Promise<{
    usuarios: Usuario[]
    total: number
  }>
  buscarUsuarioPorId(id: string): Promise<Usuario | null>
  criarUsuario(data: CriarUsuarioDTO): Promise<Usuario>
  atualizarUsuario(id: string, data: AtualizarUsuarioDTO): Promise<Usuario>
  deletarUsuario(id: string): Promise<void>
}

