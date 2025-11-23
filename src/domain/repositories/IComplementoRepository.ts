import { Complemento } from '../entities/Complemento'

export interface BuscarComplementosParams {
  limit: number
  offset: number
  q?: string
  ativo?: boolean | null
}

export interface CriarComplementoDTO {
  nome: string
  descricao?: string
  valor?: number
  ativo?: boolean
  tipoImpactoPreco?: string
}

export interface AtualizarComplementoDTO {
  nome?: string
  descricao?: string
  valor?: number
  ativo?: boolean
  tipoImpactoPreco?: string
  ordem?: number
}

/**
 * Interface do repositório de complementos
 */
export interface IComplementoRepository {
  buscarComplementos(params: BuscarComplementosParams): Promise<{
    complementos: Complemento[]
    total: number
  }>
  buscarComplementoPorId(id: string): Promise<Complemento | null>
  criarComplemento(data: CriarComplementoDTO): Promise<Complemento>
  atualizarComplemento(id: string, data: AtualizarComplementoDTO): Promise<Complemento>
  deletarComplemento(id: string): Promise<void>
}

