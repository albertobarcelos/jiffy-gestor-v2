import { useQuery } from '@tanstack/react-query'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

type ApiItem = {
  produto: string
  quantidade: number
  valorTotal: number
}

type ApiResponse = {
  items: ApiItem[]
}

type Params = {
  periodo: string
  limit?: number
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

async function fetchTopProdutos(params: Params): Promise<DashboardTopProduto[]> {
  const search = new URLSearchParams()
  search.append('periodo', params.periodo)
  search.append('limit', String(params.limit ?? 10))
  if (params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }

  const response = await fetch(`/api/dashboard/top-produtos?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao buscar top produtos.'
    throw new Error(msg)
  }

  const payload = data as unknown as ApiResponse
  const items = Array.isArray(payload.items) ? payload.items : []
  return items.map((item, index) =>
    DashboardTopProduto.create({
      rank: index + 1,
      produto: item.produto,
      quantidade: item.quantidade,
      valorTotal: item.valorTotal,
    })
  )
}

export function useDashboardTopProdutosQuery({
  periodo,
  limit = 10,
  periodoInicial,
  periodoFinal,
  enabled = true,
}: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'top-produtos',
      periodo,
      limit,
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
    ],
    queryFn: () => fetchTopProdutos({ periodo, limit, periodoInicial, periodoFinal, enabled }),
    enabled,
    staleTime: 30_000,
  })
}

