import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { useCallback, useRef } from 'react'

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
    const matchErro = xmlRetorno.match(/<erro>[\s\S]*?<xMotivo[^>]*>(.*?)<\/xMotivo>[\s\S]*?<\/erro>/i)
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
  const domainCode = payload.codigo || payload.codigoErro || payload.codigoRejeicao || payload.categoria
  return domainCode ? `[${domainCode}] ${baseMessage}` : baseMessage
}

function resolveMensagemErroCancelamento(payload: CancelamentoErrorPayload, statusCode: number): string {
  const baseMessage = payload.error || payload.message || `Erro ${statusCode}: não foi possível cancelar a venda`
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

  const indisponivelTemporario =
    baseMessage.toLowerCase().includes('temporariamente indisponível para cancelamento')

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
const fiscalConfigCache = new Map<string, { expiresAt: number; value: FiscalEmissionResolvedConfig }>()
const fiscalConfigInflight = new Map<string, Promise<FiscalEmissionResolvedConfig>>()

function buildFiscalConfigCacheKey(token: string, modelo: 55 | 65): string {
  return `${modelo}:${token}`
}

async function resolveFiscalEmissionConfig(
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

  const numeracaoResponse = await fetch(`/api/v1/fiscal/configuracoes/emissao?modelo=${modelo}`, {
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
  const numeracoesBase = (Array.isArray(numeracoesPayload)
    ? numeracoesPayload
    : numeracoesPayload
      ? [numeracoesPayload]
      : []) as Array<{
    serie?: number
    ativo?: boolean
    terminalId?: string | null
    ambiente?: 'HOMOLOGACAO' | 'PRODUCAO' | string
    modelo?: number
  }>

  let numeracoes = numeracoesBase
    .filter((n) => Number(n?.modelo ?? modelo) === modelo)

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
      const response = await fetch(
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
    numeracoes.find((n) => n.ativo !== false && (n.terminalId == null)) ||
    numeracoes.find((n) => n.terminalId == null) ||
    numeracoes.find((n) => n.ativo !== false) ||
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

  const empresaFiscalResponse = await fetch('/api/v1/fiscal/empresas-fiscais/me', {
    headers: authHeaders,
  })

  if (!empresaFiscalResponse.ok) {
    const errorData = await empresaFiscalResponse.json().catch(() => ({}))
    throw new Error(
      errorData.error ||
        errorData.message ||
        'Configuração fiscal da empresa não encontrada.'
    )
  }

  const empresaFiscalData = await empresaFiscalResponse.json()
  const crt = Number(empresaFiscalData?.codigoRegimeTributario) as 1 | 2 | 3

  if (![1, 2, 3].includes(crt)) {
    throw new Error(
      'CRT (Regime Tributário) inválido na configuração fiscal da empresa.'
    )
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
  periodoInicial?: string
  periodoFinal?: string
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
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const queryKey = ['vendas', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<{ vendas: any[]; count: number }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.tipoVenda) searchParams.append('tipoVenda', params.tipoVenda)
      if (params.abertoPorId) searchParams.append('abertoPorId', params.abertoPorId)
      if (params.canceladoPorId) searchParams.append('canceladoPorId', params.canceladoPorId)
      if (params.valorFinalMinimo) searchParams.append('valorFinalMinimo', params.valorFinalMinimo.toString())
      if (params.valorFinalMaximo) searchParams.append('valorFinalMaximo', params.valorFinalMaximo.toString())
      if (params.meioPagamentoId) searchParams.append('meioPagamentoId', params.meioPagamentoId)
      if (params.terminalId) searchParams.append('terminalId', params.terminalId)
      if (params.periodoInicial) searchParams.append('periodoInicial', params.periodoInicial)
      if (params.periodoFinal) searchParams.append('periodoFinal', params.periodoFinal)
      if (params.status) {
        params.status.forEach((status) => searchParams.append('status', status))
      }
      if (params.solicitarEmissaoFiscal !== undefined) {
        searchParams.append('solicitarEmissaoFiscal', params.solicitarEmissaoFiscal.toString())
      }
      if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetch(`/api/vendas?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as CancelamentoErrorPayload
        const errorMessage = resolveMensagemErroCancelamento(errorData, response.status)
        throw new Error(errorMessage)
      }

      const data: VendasResponse = await response.json()

      // A API pode retornar items ou data
      const vendas = data.items || data.data || []
      const count = data.count || data.total || 0

      return {
        vendas,
        count,
      }
    },
    enabled: !!token,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

/**
 * Hook para buscar uma única venda por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useVenda(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<any, ApiError>({
    queryKey: ['venda', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/vendas/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar venda ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return data
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar uma nova venda
 */
export function useCreateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (data: any) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData, null, 2),
        })
        const errorMessage = errorData.error || errorData.message || errorData.details || `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      showToast.success('Venda criada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao criar venda')
    },
  })
}

/**
 * Hook para criar uma nova venda do gestor (venda_gestor)
 */
export function useCreateVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (data: any) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/vendas/gestor', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || errorData.details || `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      // Toast de sucesso é exibido no componente
    },
    onError: (error: Error) => {
      // Toast de erro é exibido no componente
    },
  })
}

/**
 * Hook para atualizar uma venda existente
 */
export function useUpdateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })
      showToast.success('Venda atualizada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao atualizar venda')
    },
  })
}

/**
 * Hook para duplicar uma venda
 */
export function useDuplicateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (params: { id: string; tabelaOrigem: 'venda' | 'venda_gestor' }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const path =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}/duplicar`
          : `/api/vendas/${params.id}/duplicar`

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      showToast.success('Venda duplicada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao duplicar venda')
    },
  })
}

/**
 * Hook para marcar uma venda para emissão fiscal (solicitarEmissaoFiscal = true).
 * PDV: PATCH /api/vendas/:id com body { solicitarEmissaoFiscal: true }.
 * Gestor: PATCH /api/vendas/gestor/:id com body { solicitarEmissaoFiscal: true }.
 */
export function useMarcarEmissaoFiscal() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (params: {
      id: string
      tabelaOrigem?: 'venda' | 'venda_gestor'
      /** Não exibir toast de sucesso (ex.: correção automática no Kanban) */
      silent?: boolean
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}`
          : `/api/vendas/${params.id}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', params.id] })
      if (!params.silent) {
        showToast.success('Venda marcada para emissão fiscal!')
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao marcar emissão fiscal')
    },
  })
}

/**
 * Hook para desmarcar uma venda da emissão fiscal (solicitarEmissaoFiscal = false).
 * Usado ao arrastar um card da coluna Pendente Emissão de volta para Finalizadas.
 * PDV: PATCH /api/vendas/:id com body { solicitarEmissaoFiscal: false }.
 * Gestor: PATCH /api/vendas/gestor/:id com body { solicitarEmissaoFiscal: false }.
 */
export function useDesmarcarEmissaoFiscal() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (params: { id: string; tabelaOrigem?: 'venda' | 'venda_gestor' }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const url =
        params.tabelaOrigem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.id}`
          : `/api/vendas/${params.id}`

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', params.id] })
      showToast.success('Venda desmarcada da emissão fiscal.')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao desmarcar emissão fiscal')
    },
  })
}

/**
 * Vincula um cliente à venda (PATCH com clienteId).
 * - Gestor: PATCH /api/vendas/gestor/:id
 * - PDV: PATCH /api/vendas/:id
 * Por padrão envia apenas `clienteId`. Inclui `solicitarEmissaoFiscal` somente quando o chamador
 * passar explicitamente (ex.: preservar o valor atual da venda, sem forçar `true`).
 */
export function useVincularClienteNaVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (params: {
      vendaId: string
      clienteId: string
      tabelaOrigem?: 'venda' | 'venda_gestor'
      /** Se informado, envia o valor atual da venda (não há padrão `true`). */
      solicitarEmissaoFiscal?: boolean
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const origem = params.tabelaOrigem ?? 'venda_gestor'
      const url =
        origem === 'venda_gestor'
          ? `/api/vendas/gestor/${params.vendaId}`
          : `/api/vendas/${params.vendaId}`

      const body: Record<string, unknown> = { clienteId: params.clienteId }
      if (params.solicitarEmissaoFiscal !== undefined) {
        body.solicitarEmissaoFiscal = params.solicitarEmissaoFiscal
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', params.vendaId] })
      showToast.success('Cliente vinculado à venda.')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao vincular cliente à venda')
    },
  })
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda PDV.
 * Fluxo assíncrono real: retorna após enfileirar/processar no backend.
 * A atualização final de status vem por webhook + refetch.
 */
export function useEmitirNfe() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({
      id,
      modelo,
    }: {
      id: string
      modelo: 55 | 65
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const fiscalConfig = await resolveFiscalEmissionConfig(token, modelo)

      const response = await fetch(`/api/vendas/${id}/emitir-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
        let errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })

      if (data?.status === 'EMITIDA') {
        showToast.success('NFe emitida com sucesso!')
        return
      }

      if (data?.status === 'REJEITADA') {
        const motivo = data?.mensagemAmigavel || data?.codigoRejeicao || 'Nota fiscal rejeitada pela SEFAZ'
        showToast.error(motivo)
        return
      }

      showToast.success('NFe enviada. Aguardando retorno da SEFAZ...')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao emitir NFe')
    },
  })
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda GESTOR.
 * Fluxo assíncrono real: retorna após enfileirar/processar no backend.
 * A atualização final de status vem por webhook + refetch.
 */
export function useEmitirNfeGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({
      id,
      modelo,
    }: {
      id: string
      modelo: 55 | 65
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const fiscalConfig = await resolveFiscalEmissionConfig(token, modelo)

      const response = await fetch(`/api/vendas/gestor/${id}/emitir-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
        let errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })

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
  })
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
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (variables: ReemitirNfeVariables) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const { id, documentId, numero } = variables
      if (!documentId?.trim()) {
        throw new Error('documentId é obrigatório para reemissão.')
      }

      const response = await fetch(`/api/vendas/${id}/reemitir`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })

      await queryClient.refetchQueries({ queryKey: ['vendas-unificadas'] })

      if (data?.status === 'REJEITADA') {
        const motivo = data?.mensagemAmigavel || data?.codigoRejeicao || 'Reemissão rejeitada pela SEFAZ'
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
  })
}

/**
 * Hook para reemitir NFe (NFC-e ou NF-e) de uma venda do gestor rejeitada.
 */
export function useReemitirNfeGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (variables: ReemitirNfeVariables) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const { id, documentId, numero } = variables
      if (!documentId?.trim()) {
        throw new Error('documentId é obrigatório para reemissão.')
      }

      const response = await fetch(`/api/vendas/gestor/${id}/reemitir`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })

      await queryClient.refetchQueries({ queryKey: ['vendas-unificadas'] })

      if (data?.status === 'REJEITADA') {
        const motivo = data?.mensagemAmigavel || data?.codigoRejeicao || 'Reemissão rejeitada pela SEFAZ'
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
  })
}

/**
 * Hook para cancelar uma venda do gestor
 */
export function useCancelarVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ 
      id, 
      motivo 
    }: { 
      id: string
      motivo: string
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      if (motivo.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetch(`/api/vendas/gestor/${id}/cancelar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })
      showToast.success('Venda cancelada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao cancelar venda')
    },
  })
}

/**
 * Hook para cancelar nota fiscal de uma venda PDV
 */
export function useCancelarNotaFiscalVendaPdv() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({
      id,
      justificativa,
    }: {
      id: string
      justificativa: string
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      if (justificativa.trim().length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetch(`/api/vendas/${id}/cancelar-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })
      showToast.success('Nota fiscal cancelada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao cancelar nota fiscal')
    },
  })
}

/**
 * Hook para cancelar nota fiscal de uma venda do Gestor
 */
export function useCancelarNotaFiscalVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({
      id,
      justificativa,
    }: {
      id: string
      justificativa: string
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      if (justificativa.trim().length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetch(`/api/vendas/gestor/${id}/cancelar-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })
      showToast.success('Nota fiscal cancelada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao cancelar nota fiscal')
    },
  })
}

/**
 * Hook para excluir definitivamente uma venda do gestor.
 * Regra de negócio: permitido apenas quando não há documento fiscal autorizado/cancelado.
 */
export function useExcluirVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/gestor/${id}/excluir`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })
      showToast.success('Venda excluída definitivamente!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao excluir venda')
    },
  })
}
