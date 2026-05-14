import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

type ApiItem = {
  produto: string
  quantidade: number
  valorTotal: number
}

type ApiResponse = {
  items: ApiItem[]
  totaisPeriodo?: { quantidadeTotal: number; valorTotal: number }
}

export type DashboardTopProdutosTotaisPeriodo = {
  quantidadeTotal: number
  valorTotal: number
}

export type DashboardTopProdutosQueryData = {
  produtos: DashboardTopProduto[]
  totaisPeriodo: DashboardTopProdutosTotaisPeriodo
}

const totaisPeriodoVazio: DashboardTopProdutosTotaisPeriodo = {
  quantidadeTotal: 0,
  valorTotal: 0,
}

function normalizarTotaisPeriodo(raw: ApiResponse['totaisPeriodo']): DashboardTopProdutosTotaisPeriodo {
  if (!raw || typeof raw !== 'object') return totaisPeriodoVazio
  const q = raw.quantidadeTotal
  const v = raw.valorTotal
  return {
    quantidadeTotal: typeof q === 'number' && Number.isFinite(q) ? q : 0,
    valorTotal: typeof v === 'number' && Number.isFinite(v) ? v : 0,
  }
}

type Params = {
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  timezone?: string
  enabled?: boolean
}

async function fetchTopProdutos(
  params: Params & { token: string; timezone: string }
): Promise<DashboardTopProdutosQueryData> {
  const search = new URLSearchParams()
  search.append('periodo', params.periodo)
  search.append('timezone', params.timezone)
  if (params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }

  const response = await fetch(`/api/dashboard/top-produtos?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao buscar top produtos.'
    throw new Error(msg)
  }

  const payload = data as unknown as ApiResponse
  const items = Array.isArray(payload.items) ? payload.items : []
  const produtos = items.map((item, index) =>
    DashboardTopProduto.create({
      rank: index + 1,
      produto: item.produto,
      quantidade: item.quantidade,
      valorTotal: item.valorTotal,
    })
  )
  return {
    produtos,
    totaisPeriodo: normalizarTotaisPeriodo(payload.totaisPeriodo),
  }
}

export function useDashboardTopProdutosQuery({
  periodo,
  periodoInicial,
  periodoFinal,
  timezone,
  enabled = true,
}: Params) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const resolvedTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  return useQuery<DashboardTopProdutosQueryData>({
    queryKey: [
      'dashboard',
      'top-produtos',
      periodo,
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
      empresaId,
      resolvedTimezone,
    ],
    queryFn: () =>
      fetchTopProdutos({ periodo, periodoInicial, periodoFinal, enabled, token: token!, timezone: resolvedTimezone }),
    enabled: enabled && !!token,
    staleTime: 30_000,
  })
}
