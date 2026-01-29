import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'
import { useAuthStore } from '@/src/presentation/stores/authStore' // Para obter o token de autenticação

interface TopProdutoApiItem {
  produto: string
  quantidade: number
  valorTotal: number
}

interface TopProdutoApiResponse {
  items: TopProdutoApiItem[]
}

export class BuscarTopProdutosDetalhadoUseCase {
  async execute(periodo: string = 'hoje', limit: number = 10): Promise<DashboardTopProduto[]> {
    const { auth } = useAuthStore.getState()
    const token = auth?.getAccessToken()

    if (!token) {
      throw new Error('Token de autenticação não disponível.')
    }

    const params = new URLSearchParams()
    params.append('periodo', periodo)
    params.append('limit', limit.toString())

    const response = await fetch(`/api/dashboard/top-produtos?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || 'Erro ao buscar top produtos.')
    }

    const data: TopProdutoApiResponse = await response.json()
    const items = data.items || []

    return items.map((item, index) =>
      DashboardTopProduto.create({
        rank: index + 1,
        produto: item.produto,
        quantidade: item.quantidade,
        valorTotal: item.valorTotal,
      })
    )
  }
}

