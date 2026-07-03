import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { useCallback, useRef } from 'react'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { invalidateKanbanVendasListagens, refetchKanbanVendasListagens } from '@/features/kanban/hooks/kanbanListagemQueryCache'
import { moveVendaKanbanBalcaoEntreColunas } from '@/features/kanban/utils/kanbanVendaCacheUpdate'
import type { AcaoTransicaoKanbanEntrega } from '@/src/application/dto/TransicaoKanbanDTO'
import type { TransicaoPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import {
  mapAcaoTransicaoGestorToStatusDelivery,
  mapAcoesTransicaoGestorToStatusDelivery,
} from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'
import { emitirNotaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/EmitirNotaPedidoDeliveryUseCase'
import { deveUsarModuloDeliveryParaDetalhe } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'

/**
 * Extrai o motivo de rejeição (xMotivo) do XML de retorno da SEFAZ
 */
function extrairMotivoRejeicao(xmlRetorno: string): string | null {
  if (!xmlRetorno) return null

  try {
    // Tentar extrair xMotivo usando regex (mais simples que parser XML completo)
    // Formato: <xMotivo>mensagem</xMotivo> ou <xMotivo>mensagem</xMotivo>
    const match = xmlRetorno.match(/<xMotivo[^>]*>(.*?)<\/xMotivo>/i)
    if (match && match[1]) {
      // Decodificar entidades HTML
      return match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    }

    // Tentar formato alternativo: <erro><xMotivo>mensagem</xMotivo></erro>
    const matchErro = xmlRetorno.match(
      /<erro>[\s\S]*?<xMotivo[^>]*>(.*?)<\/xMotivo>[\s\S]*?<\/erro>/i
    )
    if (matchErro && matchErro[1]) {
      return matchErro[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    }
  } catch (error) {
    console.error('Erro ao extrair motivo de rejeição do XML:', error)
  }

  return null
}

type CancelamentoErrorPayload = {
  error?: string
  message?: string
  motivo?: string | null
  cStat?: string | null
  categoria?: string | null
  acaoSugerida?: string | null
  detalhes?: string | null
  codigo?: string | null
  codigoErro?: string | null
  codigoRejeicao?: string | null
}

function resolveDomainErrorMessage(payload: CancelamentoErrorPayload, fallback: string): string {
  const baseMessage = payload.error || payload.message || fallback
  const domainCode =
    payload.codigo || payload.codigoErro || payload.codigoRejeicao || payload.categoria
  return domainCode ? `[${domainCode}] ${baseMessage}` : baseMessage
}

function resolveMensagemErroCancelamento(
  payload: CancelamentoErrorPayload,
  statusCode: number
): string {
  const baseMessage =
    payload.error || payload.message || `Erro ${statusCode}: não foi possível cancelar a venda`
  const motivo = payload.motivo?.trim()
  const cStat = payload.cStat?.trim()
  const categoria = payload.categoria?.trim()
  const detalhes = payload.detalhes?.trim()

  const textoComposto = [baseMessage, motivo, detalhes].filter(Boolean).join(' ').toLowerCase()
  const indicaPrazoExpirado =
    (cStat && ['151', '155', '501'].includes(cStat)) ||
    textoComposto.includes('prazo de cancelamento') ||
    textoComposto.includes('fora do prazo') ||
    categoria === 'FORA_PRAZO'

  if (indicaPrazoExpirado) {
    return cStat
      ? `[${cStat}] Cancelamento fora do prazo permitido pela SEFAZ.`
      : 'Cancelamento fora do prazo permitido pela SEFAZ.'
  }

  const indisponivelTemporario = baseMessage
    .toLowerCase()
    .includes('temporariamente indisponível para cancelamento')

  if (indisponivelTemporario && motivo && !motivo.toLowerCase().includes('circuit breaker')) {
    return cStat ? `[${cStat}] ${motivo}` : motivo
  }

  if (cStat && motivo) {
    return `[${cStat}] ${motivo}`
  }

  return baseMessage
}

interface FiscalEmissionResolvedConfig {
  tipoDocumento: 'NFE' | 'NFCE'
  serie: number
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO'
  crt: 1 | 2 | 3
}

const FISCAL_CONFIG_TTL_MS = 30_000
const fiscalConfigCache = new Map<
  string,
  { expiresAt: number; value: FiscalEmissionResolvedConfig }
>()
const fiscalConfigInflight = new Map<string, Promise<FiscalEmissionResolvedConfig>>()

function buildFiscalConfigCacheKey(token: string, modelo: 55 | 65): string {
  return `${modelo}:${token}`
}

export async function resolveFiscalEmissionConfig(
  token: string,
  modelo: 55 | 65
): Promise<FiscalEmissionResolvedConfig> {
  const cacheKey = buildFiscalConfigCacheKey(token, modelo)
  const cached = fiscalConfigCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const inflight = fiscalConfigInflight.get(cacheKey)
  if (inflight) {
    return inflight
  }

  const loadPromise = (async (): Promise<FiscalEmissionResolvedConfig> => {
    const tipoDocumento: 'NFE' | 'NFCE' = modelo === 55 ? 'NFE' : 'NFCE'
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const numeracaoResponse = await fetchGestorApi(`/api/v1/fiscal/configuracoes/emissao?modelo=${modelo}`, {
      headers: authHeaders,
    })

    if (!numeracaoResponse.ok) {
      const errorData = await numeracaoResponse.json().catch(() => ({}))
      throw new Error(
        errorData.error ||
          errorData.message ||
          `Erro ao buscar numeração fiscal para modelo ${modelo}`
      )
    }

    const numeracoesPayload = await numeracaoResponse.json()
    const numeracoesBase = (
      Array.isArray(numeracoesPayload)
        ? numeracoesPayload
        : numeracoesPayload
          ? [numeracoesPayload]
          : []
    ) as Array<{
      serie?: number
      ativo?: boolean
      terminalId?: string | null
      ambiente?: 'HOMOLOGACAO' | 'PRODUCAO' | string
      modelo?: number
    }>

    let numeracoes = numeracoesBase.filter(n => Number(n?.modelo ?? modelo) === modelo)

    // Alguns backends retornam lista vazia no endpoint agregado mesmo com configuração existente.
    // Nesse caso, consulta diretamente por ambiente no endpoint específico do modelo.
    if (numeracoes.length === 0) {
      const ambientes: Array<'PRODUCAO' | 'HOMOLOGACAO'> = ['PRODUCAO', 'HOMOLOGACAO']
      const fallbackNumeracoes: Array<{
        serie?: number
        ativo?: boolean
        terminalId?: string | null
        ambiente?: 'HOMOLOGACAO' | 'PRODUCAO' | string
        modelo?: number
      }> = []

      for (const ambiente of ambientes) {
        const response = await fetchGestorApi(
          `/api/v1/fiscal/configuracoes/emissao/${modelo}?ambiente=${ambiente}`,
          { headers: authHeaders }
        )

        if (response.ok) {
          const data = await response.json()
          fallbackNumeracoes.push(data)
          continue
        }

        if (response.status === 400 || response.status === 404) {
          continue
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Erro ao buscar configuração fiscal de ${tipoDocumento} no ambiente ${ambiente}`
        )
      }

      numeracoes = fallbackNumeracoes
    }

    const numeracaoSelecionada =
      numeracoes.find(n => n.ativo !== false && n.terminalId == null) ||
      numeracoes.find(n => n.terminalId == null) ||
      numeracoes.find(n => n.ativo !== false) ||
      numeracoes[0]

    const serie = Number(numeracaoSelecionada?.serie)
    if (!Number.isFinite(serie) || serie <= 0) {
      throw new Error(
        `Numeração fiscal não configurada para ${tipoDocumento}. Configure a série no Painel do Contador.`
      )
    }
    const ambienteConfigurado = numeracaoSelecionada?.ambiente
    if (ambienteConfigurado !== 'HOMOLOGACAO' && ambienteConfigurado !== 'PRODUCAO') {
      throw new Error(
        `Ambiente fiscal não configurado em ${tipoDocumento}. Defina HOMOLOGACAO ou PRODUCAO na configuração de emissão.`
      )
    }
    const ambiente: FiscalEmissionResolvedConfig['ambiente'] = ambienteConfigurado

    const empresaFiscalResponse = await fetchGestorApi('/api/v1/fiscal/empresas-fiscais/me', {
      headers: authHeaders,
    })

    if (!empresaFiscalResponse.ok) {
      const errorData = await empresaFiscalResponse.json().catch(() => ({}))
      throw new Error(
        errorData.error || errorData.message || 'Configuração fiscal da empresa não encontrada.'
      )
    }

    const empresaFiscalData = await empresaFiscalResponse.json()
    const crt = Number(empresaFiscalData?.codigoRegimeTributario) as 1 | 2 | 3

    if (![1, 2, 3].includes(crt)) {
      throw new Error('CRT (Regime Tributário) inválido na configuração fiscal da empresa.')
    }

    const config = {
      tipoDocumento,
      serie,
      ambiente,
      crt,
    }
    fiscalConfigCache.set(cacheKey, {
      value: config,
      expiresAt: Date.now() + FISCAL_CONFIG_TTL_MS,
    })
    return config
  })()

  fiscalConfigInflight.set(cacheKey, loadPromise)
  try {
    return await loadPromise
  } finally {
    fiscalConfigInflight.delete(cacheKey)
  }
}

interface VendasQueryParams {
  q?: string
  tipoVenda?: string
  abertoPorId?: string
  canceladoPorId?: string
  valorFinalMinimo?: number
  valorFinalMaximo?: number
  meioPagamentoId?: string
  terminalId?: string
  dataFinalizacaoInicial?: string
  dataFinalizacaoFinal?: string
  status?: string[]
  solicitarEmissaoFiscal?: boolean
  statusFiscal?: string
  limit?: number
  offset?: number
}

interface VendasResponse {
  items?: any[]
  count?: number
  data?: any[]
  total?: number
}

/**
 * Hook para buscar vendas com React Query
 *
 * Benefícios:
 * - Cache automático
 * - Deduplicação de requisições
 * - Stale-while-revalidate
 * - Retry automático
 */
export function useVendas(params: VendasQueryParams = {}) {
  return useSecureTenantQuery(
    ['vendas', params],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.tipoVenda) searchParams.append('tipoVenda', params.tipoVenda)
      if (params.abertoPorId) searchParams.append('abertoPorId', params.abertoPorId)
      if (params.canceladoPorId) searchParams.append('canceladoPorId', params.canceladoPorId)
      if (params.valorFinalMinimo)
        searchParams.append('valorFinalMinimo', params.valorFinalMinimo.toString())
      if (params.valorFinalMaximo)
        searchParams.append('valorFinalMaximo', params.valorFinalMaximo.toString())
      if (params.meioPagamentoId) searchParams.append('meioPagamentoId', params.meioPagamentoId)
      if (params.terminalId) searchParams.append('terminalId', params.terminalId)
      if (params.dataFinalizacaoInicial)
        searchParams.append('dataFinalizacaoInicial', params.dataFinalizacaoInicial)
      if (params.dataFinalizacaoFinal)
        searchParams.append('dataFinalizacaoFinal', params.dataFinalizacaoFinal)
      if (params.status) {
        params.status.forEach(status => searchParams.append('status', status))
      }
      if (params.solicitarEmissaoFiscal !== undefined) {
        searchParams.append('solicitarEmissaoFiscal', params.solicitarEmissaoFiscal.toString())
      }
      if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetchGestorApi(`/api/vendas?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as CancelamentoErrorPayload
        throw new Error(resolveMensagemErroCancelamento(errorData, response.status))
      }

      const data: VendasResponse = await response.json()
      return {
        vendas: data.items || data.data || [],
        count: data.count || data.total || 0,
      }
    },
    { staleTime: 1000 * 30, refetchOnWindowFocus: true, refetchOnReconnect: true }
  )
}

/**
 * Hook para buscar uma única venda por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useVenda(id: string) {
  return useSecureTenantQuery<any>(
    ['venda', id],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/vendas/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar venda ${id}`,
          response.status,
          errorData
        )
      }

      return response.json()
    },
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Hook para criar uma nova venda
 */
export function useCreateVenda() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, data: any) => {
      const response = await fetchGestorApi('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData, null, 2),
        })
        const errorMessage =
          errorData.error ||
          errorData.message ||
          errorData.details ||
          `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        showToast.success('Venda criada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao criar venda')
      },
    }
  )
}

/**
 * Hook para criar uma nova venda do gestor (venda_gestor)
 */
export function useCreateVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, data: any) => {
      const response = await fetchGestorApi('/api/vendas/gestor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.error ||
          errorData.message ||
          errorData.details ||
          `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        // Toast de sucesso é exibido no componente
      },
      onError: (_error: Error) => {
        // Toast de erro é exibido no componente
      },
    }
  )
}

/**
 * Cria pedido delivery gestor (`POST /api/delivery/pedidos` → módulo delivery Jiffy).
 */
export function useCreatePedidoDelivery() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, data: unknown) => {
      const response = await fetchGestorApi('/api/delivery/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        const error = new Error(errorMessage)
        ;(error as { response?: { data: unknown; status: number } }).response = {
          data: errorData,
          status: response.status,
        }
        throw error
      }

      return await response.json()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
      },
    }
  )
}

/**
 * Hook para atualizar uma venda existente
 */
export function useUpdateVenda() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id, data }: { id: string; data: any }) => {
      const response = await fetchGestorApi(`/api/vendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', variables.id] })
        showToast.success('Venda atualizada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao atualizar venda')
      },
    }
  )
}

/**
 * Hook para duplicar uma venda
 */
export function useDuplicateVenda() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, params: { id: string; tabelaOrigem: 'venda' | 'venda_gestor' }) => {
      const path =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}/duplicar`
          : `/api/vendas/${params.id}/duplicar`

      const response = await fetchGestorApi(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        showToast.success('Venda duplicada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao duplicar venda')
      },
    }
  )
}

/**
 * Hook para marcar uma venda para emissão fiscal (solicitarEmissaoFiscal = true).
 * PDV: PATCH /api/vendas/:id com body { solicitarEmissaoFiscal: true }.
 * Gestor: PATCH /api/vendas/gestor/:id com body { solicitarEmissaoFiscal: true }.
 */
export function useMarcarEmissaoFiscal() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, params: {
      id: string
      tabelaOrigem?: 'venda' | 'venda_gestor'
      /** Não exibir toast de sucesso (ex.: correção automática no Kanban) */
      silent?: boolean
      /** Atualiza caches por coluna do Kanban balcão sem refetch das 3 listagens. */
      kanbanContext?: boolean
    }) => {
      const url =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}`
          : `/api/vendas/${params.id}`

      const response = await fetchGestorApi(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitarEmissaoFiscal: true }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, params) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        if (params.kanbanContext) {
          const moved = moveVendaKanbanBalcaoEntreColunas(queryClient, params.id, 'PENDENTE_EMISSAO', {
            solicitarEmissaoFiscal: true,
          })
          if (!moved) {
            invalidateKanbanVendasListagens(queryClient, { refetchType: 'active' })
          }
        } else {
          invalidateKanbanVendasListagens(queryClient)
        }
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', params.id] })
        if (!params.silent) {
          showToast.success('Venda marcada para emissão fiscal!')
        }
      },
      onError: (error: Error, params) => {
        if (params.silent) return
        showToast.error(error.message || 'Erro ao marcar emissão fiscal')
      },
    }
  )
}

/**
 * Hook para desmarcar uma venda da emissão fiscal (solicitarEmissaoFiscal = false).
 * Usado ao arrastar um card da coluna Pendente Emissão de volta para Finalizadas.
 * PDV: PATCH /api/vendas/:id com body { solicitarEmissaoFiscal: false }.
 * Gestor: PATCH /api/vendas/gestor/:id com body { solicitarEmissaoFiscal: false }.
 */
export function useDesmarcarEmissaoFiscal() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, params: {
      id: string
      tabelaOrigem?: 'venda' | 'venda_gestor'
      kanbanContext?: boolean
    }) => {
      const url =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}`
          : `/api/vendas/${params.id}`

      const response = await fetchGestorApi(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitarEmissaoFiscal: false }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, params) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        if (params.kanbanContext) {
          const moved = moveVendaKanbanBalcaoEntreColunas(queryClient, params.id, 'FINALIZADAS', {
            solicitarEmissaoFiscal: false,
          })
          if (!moved) {
            invalidateKanbanVendasListagens(queryClient, { refetchType: 'active' })
          }
        } else {
          invalidateKanbanVendasListagens(queryClient)
        }
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', params.id] })
        showToast.success('Venda desmarcada da emissão fiscal.')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao desmarcar emissão fiscal')
      },
    }
  )
}

/**
 * Vincula um cliente à venda (PATCH com clienteId).
 * - Gestor: PATCH /api/vendas/gestor/:id
 * - PDV: PATCH /api/vendas/:id
 * Por padrão envia apenas `clienteId`. Inclui `solicitarEmissaoFiscal` somente quando o chamador
 * passar explicitamente (ex.: preservar o valor atual da venda, sem forçar `true`).
 */
export function useVincularClienteNaVenda() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, params: {
      vendaId: string
      clienteId: string
      tabelaOrigem?: 'venda' | 'venda_gestor'
      /** Se informado, envia o valor atual da venda (não há padrão `true`). */
      solicitarEmissaoFiscal?: boolean
    }) => {
      const origem = params.tabelaOrigem ?? 'venda_gestor'
      const url =
        origem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.vendaId}`
          : `/api/vendas/${params.vendaId}`

      const body: Record<string, unknown> = { clienteId: params.clienteId }
      if (params.solicitarEmissaoFiscal !== undefined) {
        body.solicitarEmissaoFiscal = params.solicitarEmissaoFiscal
      }

      const response = await fetchGestorApi(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, params) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', params.vendaId] })
        showToast.success('Cliente vinculado à venda.')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao vincular cliente à venda')
      },
    }
  )
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda PDV.
 * Fluxo assíncrono real: retorna após enfileirar/processar no backend.
 * A atualização final de status vem por webhook + refetch.
 */
export function useEmitirNfe() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { id, modelo }: { id: string; modelo: 55 | 65 }) => {
      const fiscalConfig = await resolveFiscalEmissionConfig(token, modelo)

      const response = await fetchGestorApi(`/api/vendas/${id}/emitir-nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDocumento: fiscalConfig.tipoDocumento,
          modelo,
          serie: fiscalConfig.serie,
          ambiente: fiscalConfig.ambiente,
          crt: fiscalConfig.crt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage =
          errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        if (errorData.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(errorData.xmlRetorno)
          if (xMotivo) {
            errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (
        response.status === 202 ||
        result.status === 'PENDENTE' ||
        result.status === 'PENDENTE_EMISSAO' ||
        result.status === 'EMITINDO' ||
        result.status === 'PENDENTE_AUTORIZACAO' ||
        result.status === 'CONTINGENCIA'
      ) {
        return result
      }

      if (result.status === 'REJEITADA') {
        let errorMessage = 'Nota fiscal rejeitada pela SEFAZ'
        if (result.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(result.xmlRetorno)
          if (xMotivo) errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
        } else if (result.mensagemSefaz) {
          errorMessage = `Nota fiscal rejeitada: ${result.mensagemSefaz}`
        }
        throw new Error(errorMessage)
      }

      return result
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', variables.id] })

        if (data?.status === 'EMITIDA') {
          showToast.success('NFe emitida com sucesso!')
          return
        }

        if (data?.status === 'REJEITADA') {
          const motivo =
            data?.mensagemAmigavel || data?.codigoRejeicao || 'Nota fiscal rejeitada pela SEFAZ'
          showToast.error(motivo)
          return
        }

        showToast.success('NFe enviada. Aguardando retorno da SEFAZ...')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao emitir NFe')
      },
    }
  )
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda GESTOR.
 * Fluxo assíncrono real: retorna após enfileirar/processar no backend.
 * A atualização final de status vem por webhook + refetch.
 */
export function useEmitirNfeGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { id, modelo }: { id: string; modelo: 55 | 65 }) => {
      const fiscalConfig = await resolveFiscalEmissionConfig(token, modelo)

      const response = await fetchGestorApi(`/api/vendas/gestor/${id}/emitir-nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDocumento: fiscalConfig.tipoDocumento,
          modelo,
          serie: fiscalConfig.serie,
          ambiente: fiscalConfig.ambiente,
          crt: fiscalConfig.crt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage =
          errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        if (errorData.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(errorData.xmlRetorno)
          if (xMotivo) {
            errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (
        response.status === 202 ||
        result.status === 'PENDENTE' ||
        result.status === 'PENDENTE_EMISSAO' ||
        result.status === 'EMITINDO' ||
        result.status === 'PENDENTE_AUTORIZACAO' ||
        result.status === 'CONTINGENCIA'
      ) {
        return result
      }

      return result
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })

        if (data.status === 'REJEITADA') {
          const motivo = data.mensagemAmigavel || 'Nota fiscal rejeitada pela SEFAZ'
          showToast.error(motivo)
        } else if (data.status === 'EMITIDA') {
          showToast.success('NFe emitida com sucesso!')
        } else {
          showToast.success(`NFe processada (status: ${data.status})`)
        }
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao emitir NFe')
      },
    }
  )
}

/**
 * Emite NFC-e/NF-e para pedido do módulo delivery (`POST /delivery/pedidos/{id}/emitir-nota`).
 */
export function useEmitirNfeDelivery() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async ({ token }, { id, modelo }: { id: string; modelo: 55 | 65 }) => {
      return emitirNotaPedidoDeliveryUseCase.execute(id, token, modelo)
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })

        const status = data?.status != null ? String(data.status) : ''
        if (status === 'REJEITADA') {
          const motivo =
            (data.mensagemAmigavel != null ? String(data.mensagemAmigavel) : '') ||
            'Nota fiscal rejeitada pela SEFAZ'
          showToast.error(motivo)
        } else if (status === 'EMITIDA') {
          showToast.success('NFe emitida com sucesso!')
        } else if (status) {
          showToast.success(`NFe processada (status: ${status})`)
        } else {
          showToast.success('Emissão de nota solicitada.')
        }
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao emitir NFe')
      },
    }
  )
}

/** Indica se a emissão fiscal deve usar o módulo delivery (entrega/retirada gestor). */
export function deveUsarModuloDeliveryParaEmissaoFiscal(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null
): boolean {
  return deveUsarModuloDeliveryParaDetalhe(tabelaOrigem, tipoVenda)
}

/** Body alinhado ao contrato de reemitir-nota: `documentId` obrigatório; `numero` opcional. */
export type ReemitirNfeVariables = {
  /** ID da venda na URL do proxy */
  id: string
  /** ID do documento fiscal (rejeitado) — mesmo valor do GET vendas unificado `documentoFiscalId` */
  documentId: string
  /** Número da nota rejeitada, se existir na listagem */
  numero?: number
}

export function montarBodyReemitirNota(params: {
  documentId: string
  numero?: number
}): Record<string, string | number> {
  const body: Record<string, string | number> = { documentId: params.documentId.trim() }
  if (params.numero != null && Number.isFinite(Number(params.numero))) {
    body.numero = Number(params.numero)
  }
  return body
}

/**
 * Hook para reemitir NFe (NFC-e ou NF-e) de uma venda PDV rejeitada.
 */
export function useReemitirNfe() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, variables: ReemitirNfeVariables) => {
      const { id, documentId, numero } = variables
      if (!documentId?.trim()) {
        throw new Error('documentId é obrigatório para reemissão.')
      }

      const response = await fetchGestorApi(`/api/vendas/${id}/reemitir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarBodyReemitirNota({ documentId, numero })),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: async (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', variables.id] })

        await refetchKanbanVendasListagens(queryClient)

        if (data?.status === 'REJEITADA') {
          const motivo =
            data?.mensagemAmigavel || data?.codigoRejeicao || 'Reemissão rejeitada pela SEFAZ'
          showToast.error(motivo)
          return
        }

        if (data?.status === 'EMITIDA') {
          showToast.success('NFe reemitida com sucesso!')
          return
        }

        showToast.success('Reemissão enviada. Aguardando retorno da SEFAZ...')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao reemitir NFe')
      },
    }
  )
}

/**
 * Hook para reemitir NFe (NFC-e ou NF-e) de uma venda do gestor rejeitada.
 */
export function useReemitirNfeGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, variables: ReemitirNfeVariables) => {
      const { id, documentId, numero } = variables
      if (!documentId?.trim()) {
        throw new Error('documentId é obrigatório para reemissão.')
      }

      const response = await fetchGestorApi(`/api/vendas/gestor/${id}/reemitir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarBodyReemitirNota({ documentId, numero })),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: async (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })

        await refetchKanbanVendasListagens(queryClient)

        if (data?.status === 'REJEITADA') {
          const motivo =
            data?.mensagemAmigavel || data?.codigoRejeicao || 'Reemissão rejeitada pela SEFAZ'
          showToast.error(motivo)
          return
        }

        if (data?.status === 'EMITIDA') {
          showToast.success('NFe reemitida com sucesso!')
          return
        }

        showToast.success('Reemissão enviada. Aguardando retorno da SEFAZ...')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao reemitir NFe')
      },
    }
  )
}

/**
 * Hook para cancelar uma venda do gestor
 */
export function useCancelarVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id, motivo }: { id: string; motivo: string }) => {
      if (motivo.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetchGestorApi(`/api/vendas/gestor/${id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })
        showToast.success('Venda cancelada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao cancelar venda')
      },
    }
  )
}

/**
 * Hook para cancelar nota fiscal de uma venda PDV
 */
export function useCancelarNotaFiscalVendaPdv() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id, justificativa }: { id: string; justificativa: string }) => {
      if (justificativa.trim().length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetchGestorApi(`/api/vendas/${id}/cancelar-nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificativa: justificativa.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda', variables.id] })
        showToast.success('Nota fiscal cancelada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao cancelar nota fiscal')
      },
    }
  )
}

/**
 * Hook para cancelar nota fiscal de uma venda do Gestor
 */
export function useCancelarNotaFiscalVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id, justificativa }: { id: string; justificativa: string }) => {
      if (justificativa.trim().length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetchGestorApi(`/api/vendas/gestor/${id}/cancelar-nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justificativa: justificativa.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })
        showToast.success('Nota fiscal cancelada com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao cancelar nota fiscal')
      },
    }
  )
}

/**
 * Hook para excluir definitivamente uma venda do gestor.
 * Regra de negócio: permitido apenas quando não há documento fiscal autorizado/cancelado.
 */
export function useExcluirVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id }: { id: string }) => {
      const response = await fetchGestorApi(`/api/vendas/gestor/${id}/excluir`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })
        showToast.success('Venda excluída definitivamente!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao excluir venda')
      },
    }
  )
}

/** Ações operacionais do Kanban entrega (gestor legado e módulo delivery). */
export type AcaoTransicaoGestor = AcaoTransicaoKanbanEntrega

/**
 * Transição operacional da venda gestor (entrega / etapas).
 * Para `cancelar`, enviar `motivo` obrigatório conforme API.
 */
export function useTransicaoVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, {
      id,
      acao,
      acoes,
      motivo,
    }: {
      id: string
      acao?: AcaoTransicaoGestor
      acoes?: AcaoTransicaoGestor[]
      motivo?: string
    }) => {
      const payload: Record<string, unknown> =
        acoes && acoes.length > 0 ? { acoes } : { acao }
      if (motivo != null && String(motivo).trim() !== '') {
        payload.motivo = String(motivo).trim()
      }

      const response = await fetch(`/api/vendas/gestor/${id}/transicoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'], refetchType: 'none' })
        invalidateKanbanVendasListagens(queryClient, { refetchType: 'none' })
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id], refetchType: 'none' })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao atualizar etapa do pedido')
      },
    }
  )
}

/**
 * Transição operacional via módulo delivery (`PATCH /delivery/pedidos/{id}/transicao-status`).
 * Encadeia múltiplas ações com chamadas sequenciais (drag entre colunas distantes).
 */
export function useTransicaoPedidoDelivery(options?: {
  /** Chamado no fim do mutationFn (antes do onSuccess) para atualizar cache do Kanban. */
  onPedidoTransicionado?: (id: string, response: unknown) => void
}) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const onPedidoTransicionado = options?.onPedidoTransicionado

  return useSecureTenantMutation(
    async ({ token }, {
      id,
      acao,
      acoes,
      motivo,
    }: {
      id: string
      acao?: AcaoTransicaoGestor
      acoes?: AcaoTransicaoGestor[]
      motivo?: string
    }) => {
      const lista: AcaoTransicaoGestor[] =
        acoes && acoes.length > 0 ? acoes : acao ? [acao] : []

      if (lista.length === 0) {
        throw new Error('Nenhuma ação de transição informada')
      }

      const statuses = mapAcoesTransicaoGestorToStatusDelivery(lista)
      let ultimaResposta: unknown = null

      for (let i = 0; i < lista.length; i++) {
        const acaoAtual = lista[i]
        const body: TransicaoPedidoDeliveryApiRequest = {
          toStatus: statuses[i] ?? mapAcaoTransicaoGestorToStatusDelivery(acaoAtual),
        }

        if (acaoAtual === 'cancelar') {
          const motivoCancelamento = String(motivo ?? '').trim()
          if (motivoCancelamento.length < 5) {
            throw new Error('Motivo do cancelamento deve ter pelo menos 5 caracteres')
          }
          body.motivoCancelamento = motivoCancelamento
        }

        const response = await fetch(
          `/api/delivery/pedidos/${encodeURIComponent(id)}/transicao-status`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = resolveDomainErrorMessage(
            errorData,
            `Erro ${response.status}: ${response.statusText}`
          )
          throw new Error(errorMessage)
        }

        ultimaResposta = await response.json()
      }

      onPedidoTransicionado?.(id, ultimaResposta)

      return ultimaResposta
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'], refetchType: 'none' })
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id], refetchType: 'none' })
        queryClient.invalidateQueries({
          queryKey: ['tenant', empresaId, 'pedido-delivery', variables.id],
          refetchType: 'none',
        })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao atualizar etapa do pedido')
      },
    }
  )
}

/**
 * Hook para finalizar a etapa operacional de uma venda gestor (via BFF → POST …/transicoes com acao finalizar).
 * Requer backend com POST /api/v1/gestor/vendas/{id}/transicoes — ainda não disponível na API atual.
 * Pedidos balcão não devem usar este hook: o POST de criação já envia dataFinalizacao.
 */
export function useFinalzarVendaGestor() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (_, { id }: { id: string }) => {
      const response = await fetch(`/api/vendas/gestor/${id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = resolveDomainErrorMessage(
          errorData,
          `Erro ${response.status}: ${response.statusText}`
        )
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'vendas'] })
        invalidateKanbanVendasListagens(queryClient)
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'venda-gestor', variables.id] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao finalizar venda gestor')
      },
    }
  )
}
