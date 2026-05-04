import { PerfilUsuario } from '../entities/PerfilUsuario'

export interface BuscarPerfisUsuariosParams {
  limit: number
  offset: number
  q?: string
  ativo?: boolean | null
}

export interface CriarPerfilUsuarioDTO {
  role: string
  acessoMeiosPagamento?: string[]
  cancelarVenda?: boolean
  cancelarProduto?: boolean
  aplicarDescontoProduto?: boolean
  aplicarDescontoVenda?: boolean
  aplicarAcrescimoProduto?: boolean
  aplicarAcrescimoVenda?: boolean
  removerProdutoLancado?: boolean
  removerPagamento?: boolean
  reimprimir?: boolean
  acessoVisaoGeral?: boolean
  acessoHistorico?: boolean
  acessoMesa?: boolean
  acessoBalcao?: boolean
  acessoConfiguracoes?: boolean
  crudCardapio?: boolean
  crudUsuario?: boolean
  crudCliente?: boolean
  encerrarCaixa?: boolean
  lancarTaxa?: boolean
  removerTaxa?: boolean
  removerLicenca?: boolean
}

export interface AtualizarPerfilUsuarioDTO {
  role?: string
  acessoMeiosPagamento?: string[]
  cancelarVenda?: boolean
  cancelarProduto?: boolean
  aplicarDescontoProduto?: boolean
  aplicarDescontoVenda?: boolean
  aplicarAcrescimoProduto?: boolean
  aplicarAcrescimoVenda?: boolean
  removerProdutoLancado?: boolean
  removerPagamento?: boolean
  reimprimir?: boolean
  acessoVisaoGeral?: boolean
  acessoHistorico?: boolean
  acessoMesa?: boolean
  acessoBalcao?: boolean
  acessoConfiguracoes?: boolean
  crudCardapio?: boolean
  crudUsuario?: boolean
  crudCliente?: boolean
  encerrarCaixa?: boolean
  lancarTaxa?: boolean
  removerTaxa?: boolean
  removerLicenca?: boolean
}

/**
 * Interface do repositório de perfis de usuários
 */
export interface IPerfilUsuarioRepository {
  buscarPerfisUsuarios(params: BuscarPerfisUsuariosParams): Promise<{
    perfis: PerfilUsuario[]
    total: number
  }>
  buscarPerfilUsuarioPorId(id: string): Promise<PerfilUsuario | null>
  criarPerfilUsuario(data: CriarPerfilUsuarioDTO): Promise<PerfilUsuario>
  atualizarPerfilUsuario(id: string, data: AtualizarPerfilUsuarioDTO): Promise<PerfilUsuario>
  deletarPerfilUsuario(id: string): Promise<void>
}

