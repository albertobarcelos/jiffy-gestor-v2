import {
  ITaxaRepository,
  BuscarTaxasParams,
  type BuscarTaxaPorIdResult,
  type CriarTaxaPayload,
  type AtualizarTaxaPayload,
  type TerminalTaxaConfigPayload,
} from '@/src/domain/repositories/ITaxaRepository'
import { Taxa } from '@/src/domain/entities/Taxa'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Lista taxas (hom: `GET {API}/api/v1/taxas?limit=&offset=&q=`).
 */
const TAXAS_UPSTREAM_PATH = '/api/v1/taxas'

type TaxasListaResponse = {
  items?: Record<string, unknown>[]
  count?: number
  total?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export class TaxaRepository implements ITaxaRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarTaxas(params: BuscarTaxasParams): Promise<{
    taxas: Taxa[]
    total: number
  }> {
    try {
      const { limit, offset, q = '' } = params

      let url = `${TAXAS_UPSTREAM_PATH}?limit=${limit}&offset=${offset}`
      if (q) {
        url += `&q=${encodeURIComponent(q)}`
      }

      const response = await this.apiClient.request<TaxasListaResponse>(url, {
        method: 'GET',
        headers: this.headersAuth(),
      })

      const data = response.data
      const taxas = (data.items || []).map(item => Taxa.fromJSON(item))

      // Alguns ambientes enviam `count`/`total`; outros só `items` + `hasNext` (Insomnia/hom).
      const explicitTotal = data.count ?? data.total
      const total =
        typeof explicitTotal === 'number' ? explicitTotal : offset + taxas.length

      return {
        taxas,
        total,
      }
    } catch (error) {
      console.error('TaxaRepository.buscarTaxas error:', error)
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar taxas: ${error.message}`)
      }
      throw error
    }
  }

  private headersAuth(): HeadersInit {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {}
  }

  async buscarTaxaPorId(id: string): Promise<BuscarTaxaPorIdResult> {
    try {
      const path = `${TAXAS_UPSTREAM_PATH}/${encodeURIComponent(id)}`
      const response = await this.apiClient.request<Record<string, unknown>>(path, {
        method: 'GET',
        headers: this.headersAuth(),
      })

      const d = response.data
      const taxa = Taxa.fromJSON(d)

      const terminaisConfig: TerminalTaxaConfigPayload[] = []
      const raw = d.terminaisConfig
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (!item || typeof item !== 'object') continue
          const o = item as Record<string, unknown>
          const tid = o.terminalId != null ? String(o.terminalId) : ''
          if (!tid) continue
          terminaisConfig.push({
            terminalId: tid,
            ativo: o.ativo === true || o.ativo === 'true',
            automatico: o.automatico === true || o.automatico === 'true',
            mesa: o.mesa === true || o.mesa === 'true',
            balcao: o.balcao === true || o.balcao === 'true',
          })
        }
      }

      return { taxa, terminaisConfig }
    } catch (error) {
      console.error('TaxaRepository.buscarTaxaPorId error:', error)
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar taxa: ${error.message}`)
      }
      throw error
    }
  }

  async criarTaxa(data: CriarTaxaPayload): Promise<Taxa> {
    try {
      const response = await this.apiClient.request<Record<string, unknown>>(TAXAS_UPSTREAM_PATH, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: this.headersAuth(),
      })

      return Taxa.fromJSON(response.data)
    } catch (error) {
      console.error(
        'TaxaRepository.criarTaxa error:',
        error,
        error instanceof ApiError ? JSON.stringify(error.data) : ''
      )
      // Preserva ApiError para o route repassar status HTTP e corpo (issues/detalhes).
      if (error instanceof ApiError) {
        throw error
      }
      throw error
    }
  }

  async atualizarTaxa(id: string, data: AtualizarTaxaPayload): Promise<Taxa> {
    try {
      const path = `${TAXAS_UPSTREAM_PATH}/${encodeURIComponent(id)}`
      // Upstream valida `dataAtualizacao` como Date; em JSON vem string e quebra o Zod do serviço.
      const { dataAtualizacao: _omitido, ...corpoUpstream } = data
      const response = await this.apiClient.request<Record<string, unknown>>(path, {
        method: 'PATCH',
        body: JSON.stringify(corpoUpstream),
        headers: this.headersAuth(),
      })

      return Taxa.fromJSON(response.data)
    } catch (error) {
      console.error('TaxaRepository.atualizarTaxa error:', error)
      if (error instanceof ApiError) {
        throw error
      }
      throw error
    }
  }

  async excluirTaxa(id: string): Promise<void> {
    try {
      const path = `${TAXAS_UPSTREAM_PATH}/${encodeURIComponent(id)}`
      await this.apiClient.request<Record<string, unknown>>(path, {
        method: 'DELETE',
        headers: this.headersAuth(),
      })
    } catch (error) {
      console.error('TaxaRepository.excluirTaxa error:', error)
      if (error instanceof ApiError) {
        throw error
      }
      throw error
    }
  }
}
