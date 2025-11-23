import { IGrupoProdutoRepository, BuscarGruposResponse, CriarGrupoParams, AtualizarGrupoParams } from '@/src/domain/repositories/IGrupoProdutoRepository'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

export class GrupoProdutoRepository implements IGrupoProdutoRepository {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly token: string
  ) {}

  async buscarGrupos(params: {
    name?: string
    limit?: number
    offset?: number
    ativo?: boolean | null
  }): Promise<BuscarGruposResponse> {
    const queryParams = new URLSearchParams()
    if (params.name && params.name.trim() !== '') {
      queryParams.append('q', params.name)
    }
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    if (params.ativo !== null && params.ativo !== undefined) {
      queryParams.append('ativo', params.ativo.toString())
    }

    const { data } = await this.apiClient.request(
      `/api/v1/cardapio/grupos-produtos/?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    )

    return {
      items: (data.items || []).map((item: any) => GrupoProduto.fromJSON(item)),
      count: data.count || 0,
      page: data.page || 1,
      limit: data.limit || 10,
      totalPages: data.totalPages || 0,
      hasPrevious: data.hasPrevious || false,
      hasNext: data.hasNext || false,
    }
  }

  async buscarGrupoPorId(id: string): Promise<GrupoProduto | null> {
    const { data } = await this.apiClient.request(
      `/api/v1/cardapio/grupos-produtos/${id}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    )

    return data ? GrupoProduto.fromJSON(data) : null
  }

  async criarGrupo(params: CriarGrupoParams): Promise<GrupoProduto> {
    const { data } = await this.apiClient.request(
      '/api/v1/cardapio/grupos-produtos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          nome: params.nome,
          ativo: params.ativo,
          corHex: params.corHex,
          iconName: params.iconName,
          ativoDelivery: params.ativoDelivery,
          ativoLocal: params.ativoLocal,
        }),
      }
    )

    return GrupoProduto.fromJSON(data)
  }

  async atualizarGrupo(id: string, params: AtualizarGrupoParams): Promise<GrupoProduto> {
    const body: any = {}
    if (params.nome !== undefined) body.nome = params.nome
    if (params.ativo !== undefined) body.ativo = params.ativo
    if (params.corHex !== undefined) body.corHex = params.corHex
    if (params.iconName !== undefined) body.iconName = params.iconName
    if (params.ativoDelivery !== undefined) body.ativoDelivery = params.ativoDelivery
    if (params.ativoLocal !== undefined) body.ativoLocal = params.ativoLocal

    const { data } = await this.apiClient.request(
      `/api/v1/cardapio/grupos-produtos/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      }
    )

    return GrupoProduto.fromJSON(data)
  }

  async deletarGrupo(id: string): Promise<void> {
    await this.apiClient.request(`/api/v1/cardapio/grupos-produtos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
  }

  async reordenarGrupo(id: string, novaPosicao: number): Promise<void> {
    await this.apiClient.request(
      `/api/v1/cardapio/grupos-produtos/${id}/reordena-grupo`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ novaPosicao }),
      }
    )
  }
}

