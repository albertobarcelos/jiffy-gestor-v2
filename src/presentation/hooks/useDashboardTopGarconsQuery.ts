import { useQuery } from '@tanstack/react-query'
import { DashboardTopGarcom } from '@/src/domain/entities/DashboardTopGarcom'

type ApiItem = {
  usuarioId: string
  nome: string
  qtdProdutos: number
  qtdVendas: number
  valorTotal: number
}

type ApiResponse = {
  items: ApiItem[]
  totalUsuariosComVendas?: number
}

type Params = {
  periodo: string
  limit?: number
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

export type DashboardTopGarconsQueryData = {
  garcons: DashboardTopGarcom[]
  totalUsuariosComVendas: number
}

async function fetchTopGarcons(params: Params): Promise<DashboardTopGarconsQueryData> {
  const search = new URLSearchParams()
  search.append('periodo', params.periodo)
  search.append('limit', String(params.limit ?? 10))
  if (params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }

  const response = await fetch(`/api/dashboard/top-garcons?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao buscar top garçons.'
    throw new Error(msg)
  }

  const payload = data as unknown as ApiResponse
  const items = Array.isArray(payload.items) ? payload.items : []
  const totalUsuariosComVendas =
    typeof payload.totalUsuariosComVendas === 'number'
      ? payload.totalUsuariosComVendas
      : items.length

  const garcons = items.map((item, index) =>
    DashboardTopGarcom.create({
      rank: index + 1,
      nome: item.nome,
      qtdProdutos: item.qtdProdutos,
      qtdVendas: item.qtdVendas,
      valorTotal: item.valorTotal,
    })
  )

  return { garcons, totalUsuariosComVendas }
}

export function useDashboardTopGarconsQuery({
  periodo,
  limit = 10,
  periodoInicial,
  periodoFinal,
  enabled = true,
}: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'top-garcons',
      periodo,
      limit,
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
    ],
    queryFn: () => fetchTopGarcons({ periodo, limit, periodoInicial, periodoFinal, enabled }),
    enabled,
    staleTime: 30_000,
  })
}
