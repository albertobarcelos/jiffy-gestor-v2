import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { serializarPedidosDeliveryQueryParams } from '@/src/application/dto/api/pedidoDeliveryListQuery'
import type { PedidosDeliveryListResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'
import {
  mapearEntregadorIdPedidoDelivery,
  mapearSnapshotCoberturaPedidoDelivery,
} from '@/src/application/mappers/SnapshotCoberturaPedidoDeliveryMapper'
import type { IRelatorioEntregadoresFonteRepository } from '@/src/domain/repositories/IRelatorioEntregadoresFonteRepository'
import {
  idCoberturaRelatorio,
  type CoberturaRelatorio,
  type EntregadorRelatorio,
  type PedidoRelatorioEntregadores,
  type PeriodoFinalizacaoRelatorio,
} from '@/src/domain/relatorio-entregadores/tipos'

function numeroTaxa(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function mapearCoberturasPayload(
  payload: unknown,
  tipo: CoberturaRelatorio['tipo']
): CoberturaRelatorio[] {
  return itensDePayload(payload)
    .map((raw): CoberturaRelatorio | null => {
      if (!raw || typeof raw !== 'object') return null
      const row = raw as Record<string, unknown>
      const origemId = String(row.id ?? '').trim()
      if (!origemId) return null
      const nomePadrao = tipo === 'area' ? 'Área sem nome' : 'Raio sem nome'
      return {
        id: idCoberturaRelatorio(tipo, origemId),
        tipo,
        origemId,
        nome: row.nome != null && String(row.nome).trim() ? String(row.nome).trim() : nomePadrao,
        valorTaxa: numeroTaxa(row.valorTaxa),
      }
    })
    .filter((item): item is CoberturaRelatorio => item !== null)
}

const LISTA_LIMIT = 100
const MAX_PAGINAS_PEDIDOS = 10
const MAX_PAGINAS_ENTREGADORES = 10
const MAX_DETALHES = 150
const CONCORRENCIA_DETALHE = 5

function itensDePayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
    if (o.data && typeof o.data === 'object' && Array.isArray((o.data as Record<string, unknown>).items)) {
      return (o.data as Record<string, unknown>).items as unknown[]
    }
  }
  return []
}

function extrairItemsPedidos(payload: unknown): Array<{
  id?: string
  statusDelivery?: string
  tipoEntrega?: string
  entregador?: { id?: string | null } | null
  dataCriacao?: string | Date | null
  dataFinalizacao?: string | Date | null
}> {
  return itensDePayload(payload).filter(
    (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')
  ) as Array<{
    id?: string
    statusDelivery?: string
    tipoEntrega?: string
    entregador?: { id?: string | null } | null
    dataCriacao?: string | Date | null
    dataFinalizacao?: string | Date | null
  }>
}

function parseData(raw: unknown): Date | null {
  if (raw == null) return null
  const d = raw instanceof Date ? raw : new Date(String(raw))
  return Number.isNaN(d.getTime()) ? null : d
}

function mapearEntregador(raw: unknown): EntregadorRelatorio | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = String(row.id ?? '').trim()
  if (!id) return null
  return {
    id,
    nome: row.nome != null ? String(row.nome).trim() : '',
    telefone: row.telefone != null ? String(row.telefone) : null,
  }
}

async function mapearComConcorrencia<T, R>(
  items: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += limite) {
    const fatia = items.slice(i, i + limite)
    const parte = await Promise.all(fatia.map(fn))
    out.push(...parte)
  }
  return out
}

export class RelatorioEntregadoresFonteRepository implements IRelatorioEntregadoresFonteRepository {
  constructor(private readonly api: ApiClient = new ApiClient()) {}

  async carregar(input: {
    token: string
    periodo: PeriodoFinalizacaoRelatorio
  }): Promise<{
    coberturas: CoberturaRelatorio[]
    entregadores: EntregadorRelatorio[]
    pedidos: PedidoRelatorioEntregadores[]
    truncado: boolean
  }> {
    const headers = {
      Authorization: `Bearer ${input.token}`,
      Accept: 'application/json',
    }

    const [coberturas, entregadores, listagem] = await Promise.all([
      this.carregarCoberturas(headers),
      this.carregarEntregadores(headers),
      this.carregarPedidosDoPeriodo(headers, input.periodo),
    ])

    const paraDetalhe = listagem.pedidos.slice(0, MAX_DETALHES)
    const truncado = listagem.truncado || listagem.pedidos.length > MAX_DETALHES

    const enriquecidos = await mapearComConcorrencia(paraDetalhe, CONCORRENCIA_DETALHE, async pedido => {
      const detalhe = await this.carregarDetalhe(headers, pedido.id)
      if (!detalhe) return pedido
      return {
        ...pedido,
        entregadorId: mapearEntregadorIdPedidoDelivery(detalhe) ?? pedido.entregadorId,
        cobertura: mapearSnapshotCoberturaPedidoDelivery(detalhe),
      }
    })

    return {
      coberturas,
      entregadores,
      pedidos: enriquecidos,
      truncado,
    }
  }

  private async carregarCoberturas(headers: HeadersInit): Promise<CoberturaRelatorio[]> {
    const [areasRes, raiosRes] = await Promise.all([
      this.api.request<unknown>('/api/v1/delivery/empresas/me/areas-entrega', {
        method: 'GET',
        headers,
      }),
      this.api.request<unknown>('/api/v1/delivery/empresas/me/raios-entrega', {
        method: 'GET',
        headers,
      }),
    ])

    return [
      ...mapearCoberturasPayload(areasRes.data, 'area'),
      ...mapearCoberturasPayload(raiosRes.data, 'raio'),
    ]
  }

  private async carregarEntregadores(headers: HeadersInit): Promise<EntregadorRelatorio[]> {
    const todos: EntregadorRelatorio[] = []
    for (let pagina = 0; pagina < MAX_PAGINAS_ENTREGADORES; pagina++) {
      const offset = pagina * LISTA_LIMIT
      const res = await this.api.request<unknown>(
        `/api/v1/delivery/entregadores?limit=${LISTA_LIMIT}&offset=${offset}`,
        { method: 'GET', headers }
      )
      const chunk = itensDePayload(res.data)
        .map(mapearEntregador)
        .filter((item): item is EntregadorRelatorio => item !== null)
      todos.push(...chunk)
      if (chunk.length < LISTA_LIMIT) break
    }
    return todos
  }

  private async carregarPedidosDoPeriodo(
    headers: HeadersInit,
    periodo: PeriodoFinalizacaoRelatorio
  ): Promise<{ pedidos: PedidoRelatorioEntregadores[]; truncado: boolean }> {
    const [porFinalizacao, porCriacao] = await Promise.all([
      this.paginarPedidos(headers, {
        statusDelivery: 'FINALIZADO',
        dataFinalizacaoInicial: periodo.inicio.toISOString(),
        dataFinalizacaoFinal: periodo.fim.toISOString(),
      }),
      this.paginarPedidos(headers, {
        dataCriacaoInicial: periodo.inicio.toISOString(),
        dataCriacaoFinal: periodo.fim.toISOString(),
      }),
    ])

    const porId = new Map<string, PedidoRelatorioEntregadores>()
    for (const pedido of [...porFinalizacao.pedidos, ...porCriacao.pedidos]) {
      porId.set(pedido.id, pedido)
    }

    return {
      pedidos: Array.from(porId.values()),
      truncado: porFinalizacao.truncado || porCriacao.truncado,
    }
  }

  private async paginarPedidos(
    headers: HeadersInit,
    extras: {
      statusDelivery?: 'FINALIZADO'
      dataFinalizacaoInicial?: string
      dataFinalizacaoFinal?: string
      dataCriacaoInicial?: string
      dataCriacaoFinal?: string
    }
  ): Promise<{ pedidos: PedidoRelatorioEntregadores[]; truncado: boolean }> {
    const pedidos: PedidoRelatorioEntregadores[] = []
    let truncado = false

    for (let pagina = 0; pagina < MAX_PAGINAS_PEDIDOS; pagina++) {
      const query = serializarPedidosDeliveryQueryParams({
        offset: pagina * LISTA_LIMIT,
        limit: LISTA_LIMIT,
        tipoEntrega: 'entrega',
        cancelado: false,
        ...extras,
      }).toString()

      const res = await this.api.request<PedidosDeliveryListResponse>(
        `/api/v1/delivery/pedidos?${query}`,
        { method: 'GET', headers }
      )

      const items = extrairItemsPedidos(res.data)
      for (const item of items) {
        pedidos.push({
          id: String(item.id ?? ''),
          statusDelivery: String(item.statusDelivery ?? ''),
          tipoEntrega: String(item.tipoEntrega ?? 'entrega'),
          entregadorId: item.entregador?.id?.trim() || null,
          dataCriacao: parseData(item.dataCriacao),
          dataFinalizacao: parseData(item.dataFinalizacao),
          cobertura: null,
        })
      }

      const hasNext = res.data && typeof res.data === 'object' && 'hasNext' in res.data
        ? res.data.hasNext === true
        : items.length >= LISTA_LIMIT
      if (hasNext && pagina === MAX_PAGINAS_PEDIDOS - 1) {
        truncado = true
      }
      if (!hasNext || items.length < LISTA_LIMIT) break
    }

    return { pedidos: pedidos.filter(p => p.id), truncado }
  }

  private async carregarDetalhe(
    headers: HeadersInit,
    pedidoId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await this.api.request<unknown>(
        `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoId)}`,
        { method: 'GET', headers }
      )
      return res.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
}
