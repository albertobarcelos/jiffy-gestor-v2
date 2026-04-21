import { Taxa } from '../entities/Taxa'

export interface BuscarTaxasParams {
  limit: number
  offset: number
  q?: string
}

export interface TerminalTaxaConfigPayload {
  terminalId: string
  ativo: boolean
  automatico: boolean
  mesa: boolean
  balcao: boolean
}

export interface CriarTaxaPayload {
  nome: string
  valor: number
  tipo: 'percentual' | 'fixo' | 'entrega'
  ativo: boolean
  tributado: boolean
  ncm?: string | null
  terminaisConfig?: TerminalTaxaConfigPayload[]
}

export interface AtualizarTaxaPayload {
  nome: string
  valor: number
  tipo: 'percentual' | 'fixo' | 'entrega'
  ativo: boolean
  tributado: boolean
  ncm?: string | null
  /** Ecológico do cliente; o repositório não envia ao upstream (evita conflito tipo Date/string). */
  dataAtualizacao?: string
  terminaisConfig?: TerminalTaxaConfigPayload[]
}

export interface BuscarTaxaPorIdResult {
  taxa: Taxa
  terminaisConfig: TerminalTaxaConfigPayload[]
}

/**
 * Repositório de taxas (lista e criação no backend).
 */
export interface ITaxaRepository {
  buscarTaxas(params: BuscarTaxasParams): Promise<{
    taxas: Taxa[]
    total: number
  }>

  buscarTaxaPorId(id: string): Promise<BuscarTaxaPorIdResult>

  criarTaxa(data: CriarTaxaPayload): Promise<Taxa>

  atualizarTaxa(id: string, data: AtualizarTaxaPayload): Promise<Taxa>

  /** Soft delete no upstream (`DELETE /api/v1/taxas/:id`, resposta típica 204). */
  excluirTaxa(id: string): Promise<void>
}
