import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

/**
 * Primeiro texto não vazio entre candidatos (null, undefined e string só com espaços ignorados).
 * Importante: `"" ?? resumoFiscal.status` em JS mantém ""; por isso não usamos ?? em cadeia para status.
 */
function primeiroStatusTextoNaoVazio(...candidatos: unknown[]): string | undefined {
  for (const c of candidatos) {
    if (c == null) continue
    const s = String(c).trim()
    if (s) return s
  }
  return undefined
}

/**
 * Status fiscal exibido no Kanban / DTO unificado.
 *
 * Alinhamento com o detalhe da venda (NovoPedidoModal): lá o fiscal costuma vir em `resumoFiscal.status`.
 * No GET /vendas/unificado o backend costuma expor `statusFiscal` na raiz; em alguns casos só um dos dois vem
 * preenchido (ou a raiz vem string vazia). Ordem de prioridade:
 * 1) `statusFiscal` (raiz)  2) `status_fiscal` (raiz)  3) `resumoFiscal.status`  4) `resumoFiscal.statusFiscal`
 *
 * Depois: trim + UPPER para bater com === 'REJEITADA' no FiscalFlowKanban e StatusFiscalBadge.
 */
function normalizarStatusFiscalUnificado(
  item: Record<string, unknown>
): VendaUnificadaDTO['statusFiscal'] {
  const rf =
    item.resumoFiscal && typeof item.resumoFiscal === 'object'
      ? (item.resumoFiscal as Record<string, unknown>)
      : null

  const raw = primeiroStatusTextoNaoVazio(
    item.statusFiscal,
    item.status_fiscal,
    rf?.status,
    rf?.statusFiscal
  )
  if (!raw) return null
  return raw.toUpperCase() as VendaUnificadaDTO['statusFiscal']
}

/** Evita Boolean("false") === true se a API enviar string */
function parseSolicitarEmissaoFiscal(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase()
    if (t === 'true' || t === '1') return true
    if (t === 'false' || t === '0' || t === '') return false
  }
  return Boolean(raw)
}

/**
 * DTO unificado para vendas do PDV e do Gestor (TypeScript)
 * Deve corresponder à classe VendaUnificadaDTO do backend
 */
export class VendaUnificadaDTO {
  constructor(
    public readonly id: string,
    public readonly numeroVenda: number,
    public readonly codigoVenda: string,
    public readonly tipoVenda: string | null,
    public readonly origem: 'PDV' | 'GESTOR' | 'DELIVERY_IFOOD' | 'DELIVERY_UBER',
    public readonly tabelaOrigem: 'venda' | 'venda_gestor',
    public readonly valorFinal: number,
    public readonly totalDesconto: number,
    public readonly totalAcrescimo: number,
    public readonly dataCriacao: string,
    public readonly dataFinalizacao: string | null,
    public readonly dataCancelamento: string | null,
    public readonly cliente: {
      id: string
      nome: string
      cpfCnpj?: string
    } | null,
    public readonly solicitarEmissaoFiscal: boolean,
    public readonly statusFiscal:
      | 'PENDENTE'
      | 'PENDENTE_EMISSAO'
      | 'EMITINDO'
      | 'PENDENTE_AUTORIZACAO'
      | 'CONTINGENCIA'
      | 'EMITIDA'
      | 'REJEITADA'
      | 'CANCELADA'
      | null,
    public readonly documentoFiscalId: string | null,
    public readonly abertoPor: {
      id: string
      nome: string
    },
    public readonly numeroFiscal?: number | null,
    public readonly serieFiscal?: string | null,
    public readonly dataEmissaoFiscal?: string | null,
    public readonly tipoDocFiscal?: 'NFE' | 'NFCE' | null,
    public readonly retornoSefaz?: string | null
  ) {}

  private possuiDocumentoFiscal(): boolean {
    return !!this.documentoFiscalId || !!this.numeroFiscal
  }

  isPendenteEmissao(): boolean {
    // Vendas GESTOR: pendentes apenas quando foram marcadas para emissão (solicitarEmissaoFiscal), igual ao PDV
    // Vendas PDV: pendentes apenas se foram marcadas para emissão
    if (this.isCancelada()) return false

    if (this.isVendaGestor()) {
      return !!this.solicitarEmissaoFiscal && this.statusFiscal !== 'EMITIDA'
    }

    return this.solicitarEmissaoFiscal && this.statusFiscal !== 'EMITIDA'
  }

  temNFeEmitida(): boolean {
    const statusComDocumentoValido =
      this.statusFiscal === 'EMITIDA' || this.statusFiscal === 'CANCELADA'

    return statusComDocumentoValido && this.possuiDocumentoFiscal()
  }

  isVendaPdv(): boolean {
    return this.tabelaOrigem === 'venda'
  }

  isVendaGestor(): boolean {
    return this.tabelaOrigem === 'venda_gestor'
  }

  isDelivery(): boolean {
    return this.origem === 'DELIVERY_IFOOD' || this.origem === 'DELIVERY_UBER'
  }

  /** Venda cancelada: por dataCancelamento ou por statusFiscal CANCELADA (API pode não enviar dataCancelamento) */
  isCancelada(): boolean {
    return !!this.dataCancelamento || this.statusFiscal === 'CANCELADA'
  }

  getEtapaKanban(): string {
    if (this.temNFeEmitida()) return 'COM_NFE'
    // Rejeitada: coluna "Pendente Emissão Fiscal" para reenvio/reemissão (botão vira "Reemitir NFe/NFCe")
    if (this.statusFiscal === 'REJEITADA') return 'PENDENTE_EMISSAO'
    // Aguardando retorno da SEFAZ (badge "Aguardando SEFAZ...") — só em "Com Nota Solicitada"
    if (this.statusFiscal === 'PENDENTE' || this.statusFiscal === 'PENDENTE_AUTORIZACAO') {
      return 'COM_NFE'
    }
    if (this.isPendenteEmissao()) return 'PENDENTE_EMISSAO'
    if (this.dataFinalizacao) return 'FINALIZADAS'
    return 'ABERTA'
  }
}

/**
 * Parâmetros alinhados ao contrato do backend GET /vendas/unificado:
 * - origem, statusFiscal, periodoInicial, periodoFinal (dataCriacao)
 * - dataFinalizacaoInicio, dataFinalizacaoFim
 * - q (busca)
 * Paginação: `useVendasUnificadas` obtém **todas** as páginas (100 itens por requisição até acabar).
 */
interface VendasUnificadasQueryParams {
  origem?: 'PDV' | 'GESTOR' | 'DELIVERY'
  statusFiscal?: string
  periodoInicial?: string // ISO date string (dataCriacao)
  periodoFinal?: string // ISO date string (dataCriacao)
  dataFinalizacaoInicio?: string // ISO date string
  dataFinalizacaoFim?: string // ISO date string
  q?: string // termo de busca
}

/** Resposta do backend: PaginationResult<VendaUnificadaDTO> */
interface VendasUnificadasResponse {
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  items: VendaUnificadaDTO[]
}

/** Tamanho máximo por requisição (API); busca completa é feita em páginas de 100 em 100. */
export const VENDAS_UNIFICADAS_PAGE_SIZE = 100

/** Converte um item bruto da API em DTO (reutilizado em cada página). */
function mapItemJsonParaVendaUnificadaDTO(v: Record<string, unknown>): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    v.id as string,
    v.numeroVenda as number,
    v.codigoVenda as string,
    v.tipoVenda as string | null,
    v.origem as VendaUnificadaDTO['origem'],
    v.tabelaOrigem as VendaUnificadaDTO['tabelaOrigem'],
    v.valorFinal as number,
    v.totalDesconto as number,
    v.totalAcrescimo as number,
    v.dataCriacao as string,
    v.dataFinalizacao as string | null,
    (v.dataCancelamento ?? null) as string | null,
    v.cliente as VendaUnificadaDTO['cliente'],
    parseSolicitarEmissaoFiscal(v.solicitarEmissaoFiscal),
    normalizarStatusFiscalUnificado(v),
    (v.documentoFiscalId ?? null) as string | null,
    v.abertoPor as VendaUnificadaDTO['abertoPor'],
    v.numeroFiscal as number | null | undefined,
    v.serieFiscal as string | null | undefined,
    v.dataEmissaoFiscal as string | null | undefined,
    v.tipoDocFiscal as VendaUnificadaDTO['tipoDocFiscal'],
    v.retornoSefaz as string | null | undefined
  )
}

function montarSearchParamsVendasUnificadas(
  params: VendasUnificadasQueryParams,
  offset: number,
  limit: number
): URLSearchParams {
  const searchParams = new URLSearchParams()
  if (params.origem) searchParams.append('origem', params.origem)
  if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
  if (params.periodoInicial) searchParams.append('periodoInicial', params.periodoInicial)
  if (params.periodoFinal) searchParams.append('periodoFinal', params.periodoFinal)
  if (params.dataFinalizacaoInicio)
    searchParams.append('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
  if (params.dataFinalizacaoFim)
    searchParams.append('dataFinalizacaoFim', params.dataFinalizacaoFim)
  if (params.q?.trim()) searchParams.append('q', params.q.trim())
  searchParams.append('offset', String(offset))
  searchParams.append('limit', String(limit))
  return searchParams
}

/**
 * Hook para buscar vendas unificadas (PDV + Gestor) com React Query.
 * Busca páginas de 100 em 100 até `hasNext` ser false ou até critérios de parada seguros:
 * total já atingiu `count` da API, já passou `totalPages` (se não houver count), ou página só repete ids.
 */
export function useVendasUnificadas(params: VendasUnificadasQueryParams) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const queryKey = ['vendas-unificadas', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<VendasUnificadasResponse> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const pageSize = VENDAS_UNIFICADAS_PAGE_SIZE
      const todosItens: VendaUnificadaDTO[] = []
      const idsJaRecebidos = new Set<string>()
      let offset = 0
      let totalCount = 0
      /** `count` numérico na 1ª página da API — usado para parar mesmo com hasNext errado */
      let totalCountDaApi: number | null = null
      /** `totalPages` na 1ª página — só usado se não houver count confiável */
      let totalPagesDaApi: number | null = null
      let primeiraPaginaMeta: {
        page: number
        totalPages: number
        hasPrevious: boolean
      } | null = null

      const maxPaginas = 500
      let pagina = 0

      while (pagina < maxPaginas) {
        pagina += 1
        const searchParams = montarSearchParamsVendasUnificadas(params, offset, pageSize)

        const response = await fetch(`/api/vendas/unificado?${searchParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.error ||
            errorData.message ||
            `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const rawItems = (data.items || []) as Record<string, unknown>[]
        const batch = rawItems.map(mapItemJsonParaVendaUnificadaDTO)

        if (pagina === 1) {
          if (typeof data.count === 'number' && data.count >= 0) {
            totalCountDaApi = data.count
          }
          if (typeof data.totalPages === 'number' && data.totalPages > 0) {
            totalPagesDaApi = data.totalPages
          }
          totalCount =
            totalCountDaApi !== null ? totalCountDaApi : batch.length > 0 ? batch.length : 0
          primeiraPaginaMeta = {
            page: data.page ?? 1,
            totalPages: data.totalPages ?? 1,
            hasPrevious: data.hasPrevious ?? false,
          }
        }

        // Backend pode ignorar offset: mesma página repetida → evita loop enorme / hasNext mentiroso
        const novosNaPagina =
          batch.length > 0 ? batch.filter(item => !idsJaRecebidos.has(item.id)) : []

        if (batch.length > 0 && novosNaPagina.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn(
              '[useVendasUnificadas] Página duplicada (ids já recebidos). Provável offset ignorado na API. Parando paginação.'
            )
          }
          break
        }

        for (const item of novosNaPagina) {
          idsJaRecebidos.add(item.id)
        }
        todosItens.push(...novosNaPagina)

        if (totalCountDaApi !== null && todosItens.length >= totalCountDaApi) {
          break
        }

        if (totalCountDaApi === null && totalPagesDaApi !== null && pagina >= totalPagesDaApi) {
          break
        }

        const hasNext = data.hasNext ?? false
        if (!hasNext || batch.length === 0 || batch.length < pageSize) {
          break
        }

        offset += pageSize
      }

      return {
        items: todosItens,
        count: totalCountDaApi !== null ? totalCountDaApi : Math.max(totalCount, todosItens.length),
        page: primeiraPaginaMeta?.page ?? 1,
        limit: todosItens.length,
        totalPages: primeiraPaginaMeta?.totalPages ?? 1,
        hasNext: false,
        hasPrevious: primeiraPaginaMeta?.hasPrevious ?? false,
      }
    },
    enabled: !!token,
    // Herda QueryProvider: staleTime 5min, refetchOnWindowFocus false, refetchOnMount false.
    // Não redefinir staleTime curto nem refetchOnWindowFocus aqui: ao fechar modal o foco volta à janela
    // e disparava novo GET em toda vez (dados stale após 30s).
    refetchOnReconnect: true,
    // Polling por status fiscal (PENDENTE / EMITINDO / etc.) desativado: usar botão Atualizar no Kanban.
    refetchInterval: false,
  })
}
