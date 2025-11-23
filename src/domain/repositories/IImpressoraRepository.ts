import { Impressora } from '../entities/Impressora'

export interface BuscarImpressorasParams {
  limit: number
  offset: number
  q?: string
}

export interface CriarImpressoraDTO {
  nome: string
  modelo?: string
  ativo?: boolean
  tipoConexao?: string
  ip?: string
  porta?: string
  terminais?: any[]
}

export interface AtualizarImpressoraDTO {
  nome?: string
  modelo?: string
  ativo?: boolean
  tipoConexao?: string
  ip?: string
  porta?: string
  terminais?: any[]
}

/**
 * Interface do repositório de impressoras
 */
export interface IImpressoraRepository {
  buscarImpressoras(params: BuscarImpressorasParams): Promise<{
    impressoras: Impressora[]
    total: number
  }>
  buscarImpressoraPorId(id: string): Promise<Impressora | null>
  criarImpressora(data: CriarImpressoraDTO): Promise<Impressora>
  atualizarImpressora(id: string, data: AtualizarImpressoraDTO): Promise<Impressora>
  deletarImpressora(id: string): Promise<void>
}

