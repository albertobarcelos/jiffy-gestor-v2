import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type {
  IComplementoOverrideRepository,
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'
import { mapComplementoCompletoFromApi } from '@/src/infrastructure/database/repositories/mapComplementoCompletoFromApi'

function authHeaders(token?: string): HeadersInit {
  return token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    : {
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
}

export class ComplementoOverrideRepository implements IComplementoOverrideRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  async buscarCompleto(id: string): Promise<ComplementoCompleto | null> {
    try {
      const response = await this.apiClient.request<unknown>(
        `/api/v1/cardapio/complementos-produto/${encodeURIComponent(id)}?retorno=completo`,
        {
          method: 'GET',
          headers: authHeaders(this.token),
        }
      )
      if (!response.data) return null
      return mapComplementoCompletoFromApi(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) return null
        throw new Error(`Erro ao buscar usos do complemento: ${error.message}`)
      }
      throw error
    }
  }

  async gravarOverrides(input: {
    vinculos?: VinculoComplementoOverride[]
    grupos?: ImpactoComplementoNoGrupo[]
  }): Promise<ResultadoOverridesComplemento> {
    try {
      const body: Record<string, unknown> = {}
      if (input.vinculos?.length) body.vinculos = input.vinculos
      if (input.grupos?.length) body.grupos = input.grupos

      const response = await this.apiClient.request<{
        message?: string
        atualizados?: number
      }>('/api/v1/cardapio/complementos-produto', {
        method: 'PATCH',
        headers: authHeaders(this.token),
        body: JSON.stringify(body),
      })

      return {
        message: response.data?.message || 'Configurações atualizadas com sucesso',
        atualizados:
          typeof response.data?.atualizados === 'number' ? response.data.atualizados : 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar exceção do complemento: ${error.message}`)
      }
      throw error
    }
  }

  async reordenarGrupoNoMenu(
    menuId: string,
    produtoId: string,
    grupoComplementoId: string,
    novaPosicao: number
  ): Promise<void> {
    await this.reordenar(
      menuId,
      produtoId,
      'reordena-grupo-complemento',
      { novaPosicao, grupoComplementoId },
      'Erro ao reordenar grupo de complementos'
    )
  }

  async reordenarComplementoNoMenu(
    menuId: string,
    produtoId: string,
    grupoComplementoId: string,
    complementoId: string,
    novaPosicao: number
  ): Promise<void> {
    await this.reordenar(
      menuId,
      produtoId,
      'reordena-complemento',
      { novaPosicao, grupoComplementoId, complementoId },
      'Erro ao reordenar complemento'
    )
  }

  private async reordenar(
    menuId: string,
    produtoId: string,
    acao: 'reordena-grupo-complemento' | 'reordena-complemento',
    body: Record<string, unknown>,
    mensagemErro: string
  ): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/cardapio/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}/${acao}`,
        {
          method: 'PATCH',
          headers: authHeaders(this.token),
          body: JSON.stringify(body),
        }
      )
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`${mensagemErro}: ${error.message}`)
      }
      throw error
    }
  }
}
