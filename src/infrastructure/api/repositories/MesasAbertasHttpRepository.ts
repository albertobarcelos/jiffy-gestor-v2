import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import {
  mapMesaAbertaSummary,
  mapMesasAbertasMetricas,
  mapUsuarioPdvResumo,
  resolveHasNextFromMesasResponse,
} from '@/src/application/mappers/MesasAbertasMapper'
import type { IMesasAbertasReadRepository } from '@/src/domain/repositories/IMesasAbertasReadRepository'
import type {
  ListarMesasAbertasApiParams,
  MesasAbertasApiPage,
  UsuarioPdvResumo,
} from '@/src/domain/types/mesasAbertas'

type UnknownRecord = Record<string, unknown>

export class MesasAbertasHttpRepository implements IMesasAbertasReadRepository {
  async listarMesasAbertas(
    params: ListarMesasAbertasApiParams,
    token: string
  ): Promise<MesasAbertasApiPage> {
    const query = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
      status: params.status,
      tipoVenda: params.tipoVenda,
    })

    const response = await fetchGestorApi(`/api/vendas?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
        message?: string
      }
      throw new Error(errorData.error || errorData.message || 'Erro ao buscar vendas')
    }

    const data = (await response.json()) as UnknownRecord
    const rawItems = Array.isArray(data.items) ? data.items : []
    const items = rawItems
      .map(mapMesaAbertaSummary)
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const page = Math.floor(params.offset / Math.max(params.limit, 1))

    return {
      items,
      metricas: mapMesasAbertasMetricas(data.metricas),
      hasNext: resolveHasNextFromMesasResponse(data, page, params.limit),
      page,
    }
  }

  async listarTodosUsuariosPdv(token: string): Promise<UsuarioPdvResumo[]> {
    const all: UsuarioPdvResumo[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })

      const response = await fetchGestorApi(`/api/usuarios?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) break

      const data = (await response.json()) as UnknownRecord
      const rawItems = Array.isArray(data.items) ? data.items : []
      const mapped = rawItems
        .map(mapUsuarioPdvResumo)
        .filter((item): item is UsuarioPdvResumo => item !== null)

      all.push(...mapped)
      hasMore = mapped.length === limit
      offset += mapped.length
    }

    return all
  }
}

export const mesasAbertasHttpRepository = new MesasAbertasHttpRepository()
