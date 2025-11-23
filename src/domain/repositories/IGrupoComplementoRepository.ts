import { GrupoComplemento } from '../entities/GrupoComplemento'

export interface BuscarGruposComplementosParams {
  limit: number
  offset: number
  q?: string
  ativo?: boolean | null
}

export interface CriarGrupoComplementoDTO {
  nome: string
  qtdMinima: number
  qtdMaxima: number
  ativo?: boolean
  complementosIds?: string[]
}

export interface AtualizarGrupoComplementoDTO {
  nome?: string
  qtdMinima?: number
  qtdMaxima?: number
  ativo?: boolean
  complementosIds?: string[]
}

/**
 * Interface do repositório de grupos de complementos
 */
export interface IGrupoComplementoRepository {
  buscarGruposComplementos(params: BuscarGruposComplementosParams): Promise<{
    grupos: GrupoComplemento[]
    total: number
  }>
  buscarGrupoComplementoPorId(id: string): Promise<GrupoComplemento | null>
  criarGrupoComplemento(data: CriarGrupoComplementoDTO): Promise<GrupoComplemento>
  atualizarGrupoComplemento(id: string, data: AtualizarGrupoComplementoDTO): Promise<GrupoComplemento>
  deletarGrupoComplemento(id: string): Promise<void>
}

