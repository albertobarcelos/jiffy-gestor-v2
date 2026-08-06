import { GrupoProduto } from '../entities/GrupoProduto'

export interface BuscarGruposParams {
  name?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
}

export interface CriarGrupoParams {
  nome: string
  ativo: boolean
  corHex: string
  iconName: string
  ativoDelivery: boolean
  ativoLocal: boolean
}

export interface AtualizarGrupoParams {
  nome?: string
  ativo?: boolean
  corHex?: string
  iconName?: string
  ativoDelivery?: boolean
  ativoLocal?: boolean
}

export interface BuscarGruposResponse {
  items: GrupoProduto[]
  count: number
  page: number
  limit: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

/**
 * Interface do repositório de grupos de produtos
 */
export interface IGrupoProdutoRepository {
  buscarGrupos(params: BuscarGruposParams): Promise<BuscarGruposResponse>
  buscarGrupoPorId(id: string): Promise<GrupoProduto | null>
  criarGrupo(params: CriarGrupoParams): Promise<GrupoProduto>
  atualizarGrupo(id: string, params: AtualizarGrupoParams): Promise<GrupoProduto>
  deletarGrupo(id: string): Promise<void>
  reordenarGrupo(id: string, novaPosicao: number): Promise<void>
  listarProdutosRelacionados(grupoId: string): Promise<ProdutoRelacionadoDTO[]>
  substituirProdutosRelacionados(grupoId: string, produtoIds: string[]): Promise<void>
}

export type ProdutoRelacionadoDTO = {
  produtoId: string
  ordem: number
  nome: string
  valor: number
  imagemUrl: string | null
  ativo: boolean
  ativoDelivery: boolean
  codigoProduto: number
}

