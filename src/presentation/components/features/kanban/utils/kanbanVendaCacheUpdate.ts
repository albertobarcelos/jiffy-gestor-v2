import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
import { extrairPatchKanbanDeRespostaTransicao } from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'
import { syncPedidoDeliveryDetalheCaches } from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'
import { patchVendaDetalheResumoFiscalCache } from '../../pedidos/hooks/data/useVendaDetalheCarregadaQuery'
import {
  kanbanPedidosDeliveryInfiniteQueryFilter,
  kanbanVendasUnificadasInfiniteQueryFilter,
} from '../hooks/kanbanListagemQueryCache'

export type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
export {
  extrairPatchKanbanDeRespostaTransicao,
  extrairVendaUnificadaDeRespostaDeliverySummary,
} from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'

import {
  VendaUnificadaDTO,
  VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
  type EntregadorKanbanDeliveryResumo,
  type EtapaKanbanBalcao,
  type VendasUnificadasResponse,
} from '../hooks/useVendasUnificadas'
import { extrairColumnIdDeVendasUnificadasKanbanQueryKey } from '../hooks/useVendasUnificadasKanbanColumnInfinite'

function normalizarEntregadorKanbanPatch(
  patch: KanbanVendaCachePatch['entregador']
): EntregadorKanbanDeliveryResumo | null | undefined {
  if (patch === undefined) return undefined
  if (patch === null) return null
  return {
    id: patch.id,
    nome: patch.nome ?? null,
    telefone: patch.telefone ?? null,
  }
}

function isoDeCampoApi(valor: unknown): string | null {
  if (valor == null) return null
  const texto = String(valor).trim()
  return texto || null
}

/** Extrai campos operacionais da resposta de POST /vendas/gestor/:id/transicoes (legado). */
export function extrairPatchKanbanDeTransicaoGestor(data: unknown): KanbanVendaCachePatch {
  const registro =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const statusEtapaOperacional =
    isoDeCampoApi(registro.statusOperacional) ??
    isoDeCampoApi(registro.status_operacional) ??
    isoDeCampoApi(registro.statusEtapaOperacional) ??
    isoDeCampoApi(registro.status_etapa_operacional)

  return {
    statusEtapaOperacional,
    dataUltimaModificacao:
      isoDeCampoApi(registro.dataUltimaModificacao) ??
      isoDeCampoApi(registro.data_ultima_modificacao),
    dataFinalizacao:
      isoDeCampoApi(registro.dataFinalizacao) ?? isoDeCampoApi(registro.data_finalizacao),
  }
}

function normalizarStatusFiscalPatch(
  raw: string | null,
  fallback: VendaUnificadaDTO['statusFiscal']
): VendaUnificadaDTO['statusFiscal'] {
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).trim().toUpperCase() as NonNullable<VendaUnificadaDTO['statusFiscal']>
}

function normalizarTipoDocFiscalPatch(
  raw: string | null | undefined,
  fallback: VendaUnificadaDTO['tipoDocFiscal']
): VendaUnificadaDTO['tipoDocFiscal'] {
  if (raw === undefined) return fallback
  const t = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (t === 'NFE' || t === 'NFCE') return t
  return null
}

function normalizarSerieFiscalPatch(
  raw: number | string | null | undefined,
  fallback: VendaUnificadaDTO['serieFiscal']
): VendaUnificadaDTO['serieFiscal'] {
  if (raw === undefined) return fallback
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).trim()
}

function normalizarModeloFiscalPatch(
  raw: number | null | undefined,
  fallback: VendaUnificadaDTO['modelo']
): VendaUnificadaDTO['modelo'] {
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (n === 55 || n === 65) return n
  return null
}

export function cloneVendaUnificadaDTO(
  venda: VendaUnificadaDTO,
  patch: KanbanVendaCachePatch
): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    venda.id,
    venda.numeroVenda,
    venda.codigoVenda,
    venda.tipoVenda,
    venda.origem,
    venda.tabelaOrigem,
    patch.valorFinal !== undefined ? patch.valorFinal : venda.valorFinal,
    venda.totalDesconto,
    venda.totalAcrescimo,
    venda.dataCriacao,
    patch.dataFinalizacao !== undefined ? patch.dataFinalizacao : venda.dataFinalizacao,
    venda.dataCancelamento,
    venda.cliente,
    patch.solicitarEmissaoFiscal !== undefined
      ? patch.solicitarEmissaoFiscal === true
      : venda.solicitarEmissaoFiscal,
    patch.statusFiscal !== undefined
      ? normalizarStatusFiscalPatch(patch.statusFiscal, venda.statusFiscal)
      : venda.statusFiscal,
    patch.documentoFiscalId !== undefined ? patch.documentoFiscalId : venda.documentoFiscalId,
    venda.abertoPor,
    venda.numeroMesa,
    patch.numeroFiscal !== undefined ? patch.numeroFiscal : venda.numeroFiscal,
    patch.serieFiscal !== undefined
      ? normalizarSerieFiscalPatch(patch.serieFiscal, venda.serieFiscal)
      : venda.serieFiscal,
    patch.dataEmissaoFiscal !== undefined ? patch.dataEmissaoFiscal : venda.dataEmissaoFiscal,
    patch.tipoDocFiscal !== undefined
      ? normalizarTipoDocFiscalPatch(patch.tipoDocFiscal, venda.tipoDocFiscal)
      : venda.tipoDocFiscal,
    patch.modelo !== undefined
      ? normalizarModeloFiscalPatch(patch.modelo, venda.modelo)
      : venda.modelo,
    patch.retornoSefaz !== undefined ? patch.retornoSefaz : venda.retornoSefaz,
    patch.statusEtapaOperacional !== undefined
      ? patch.statusEtapaOperacional
      : venda.statusEtapaOperacional,
    patch.dataUltimaModificacao !== undefined
      ? patch.dataUltimaModificacao
      : venda.dataUltimaModificacao,
    patch.statusFinanceiro !== undefined ? patch.statusFinanceiro : venda.statusFinanceiro,
    patch.observacoes !== undefined
      ? (patch.observacoes ?? undefined)
      : venda.observacoes,
    venda.previsaoEntregaEm,
    venda.tempoTotalEstimadoSegundos,
    venda.fluxoPagamentoEntrega,
    venda.cobrancasDelivery,
    patch.entregador !== undefined
      ? normalizarEntregadorKanbanPatch(patch.entregador)
      : venda.entregador,
    venda.contextoEntrega,
    venda.pedidoAgendado,
    venda.slotInicio,
    venda.slotFim,
    patch.etapaKanbanBalcao !== undefined ? patch.etapaKanbanBalcao : venda.etapaKanbanBalcao
  )
}

/** Substitui um item inteiro no cache infinito (resposta summary de transicao-status). */
export function replaceVendaUnificadaInfiniteCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaAtualizada: VendaUnificadaDTO
): boolean {
  let encontrou = false

  queryClient.setQueryData<InfiniteData<VendasUnificadasResponse>>(queryKey, atual => {
    if (!atual?.pages?.length) return atual

    const pages = atual.pages.map(page => ({
      ...page,
      items: page.items.map(item => {
        if (item.id !== vendaAtualizada.id) return item
        encontrou = true
        return vendaAtualizada
      }),
    }))

    return encontrou ? { ...atual, pages } : atual
  })

  return encontrou
}

/** Substitui um item em todas as listagens infinitas do Kanban balcão (queries por coluna). */
export function replaceKanbanVendasListagemCache(
  queryClient: QueryClient,
  vendaAtualizada: VendaUnificadaDTO
): boolean {
  let encontrou = false

  const queries = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
    kanbanVendasUnificadasInfiniteQueryFilter()
  )
  for (const [queryKey] of queries) {
    const replaced = replaceVendaUnificadaInfiniteCache(queryClient, queryKey, vendaAtualizada)
    if (replaced) encontrou = true
  }

  return encontrou
}

function criarCacheVazioVendasUnificadasKanban(): InfiniteData<VendasUnificadasResponse> {
  return {
    pages: [
      {
        items: [],
        count: 0,
        page: 0,
        limit: VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    ],
    pageParams: [0],
  }
}

function upsertVendaNaColunaKanbanBalcao(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  vendaAtualizada: VendaUnificadaDTO
): boolean {
  let alterou = false

  queryClient.setQueryData<InfiniteData<VendasUnificadasResponse>>(queryKey, atual => {
    const base = atual?.pages?.length ? atual : criarCacheVazioVendasUnificadasKanban()
    const vendaJaNaColuna = base.pages.some(page => page.items.some(i => i.id === vendaId))

    const pages = base.pages.map((page, pageIdx) => {
      const jaExistia = page.items.some(i => i.id === vendaId)

      if (vendaJaNaColuna) {
        if (!jaExistia) return page
        alterou = true
        return {
          ...page,
          items: page.items.map(i => (i.id === vendaId ? vendaAtualizada : i)),
        }
      }

      if (pageIdx !== 0) return page

      alterou = true
      return {
        ...page,
        items: [vendaAtualizada, ...page.items],
        count: typeof page.count === 'number' ? page.count + 1 : page.items.length + 1,
      }
    })

    return alterou ? { ...base, pages } : base
  })

  return alterou
}

function removerVendaDasOutrasColunasKanbanBalcao(
  queryClient: QueryClient,
  queries: [readonly unknown[], InfiniteData<VendasUnificadasResponse> | undefined][],
  vendaId: string,
  colunaDestino: EtapaKanbanBalcao
): void {
  for (const [queryKey] of queries) {
    const colunaId = extrairColumnIdDeVendasUnificadasKanbanQueryKey(queryKey)
    if (!colunaId || colunaId === colunaDestino) continue

    queryClient.setQueryData<InfiniteData<VendasUnificadasResponse>>(queryKey, atual => {
      if (!atual?.pages?.length) return atual

      let alterou = false
      const pages = atual.pages.map((page, pageIdx) => {
        if (!page.items.some(i => i.id === vendaId)) return page

        alterou = true
        return {
          ...page,
          items: page.items.filter(i => i.id !== vendaId),
          count:
            pageIdx === 0 && typeof page.count === 'number'
              ? Math.max(0, page.count - 1)
              : page.count,
        }
      })

      return alterou ? { ...atual, pages } : atual
    })
  }
}

/** Move card entre caches de colunas fiscais do balcão (sem refetch das 3 listagens). */
export function moveVendaKanbanBalcaoEntreColunas(
  queryClient: QueryClient,
  vendaId: string,
  colunaDestino: EtapaKanbanBalcao,
  patch?: KanbanVendaCachePatch
): boolean {
  const queries = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
    kanbanVendasUnificadasInfiniteQueryFilter()
  )

  let venda: VendaUnificadaDTO | null = null
  for (const [, data] of queries) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find(i => i.id === vendaId)
      if (found) {
        venda = found
        break
      }
    }
    if (venda) break
  }
  if (!venda) return false

  const vendaAtualizada = cloneVendaUnificadaDTO(venda, {
    ...patch,
    etapaKanbanBalcao: colunaDestino,
  })

  let destinoAtualizado = false

  for (const [queryKey] of queries) {
    const colunaId = extrairColumnIdDeVendasUnificadasKanbanQueryKey(queryKey)
    if (colunaId !== colunaDestino) continue

    if (upsertVendaNaColunaKanbanBalcao(queryClient, queryKey, vendaId, vendaAtualizada)) {
      destinoAtualizado = true
    }
  }

  if (!destinoAtualizado) {
    for (const [queryKey] of queries) {
      const colunaId = extrairColumnIdDeVendasUnificadasKanbanQueryKey(queryKey)
      if (colunaId !== colunaDestino) continue
      destinoAtualizado = upsertVendaNaColunaKanbanBalcao(
        queryClient,
        queryKey,
        vendaId,
        vendaAtualizada
      )
      break
    }
  }

  removerVendaDasOutrasColunasKanbanBalcao(queryClient, queries, vendaId, colunaDestino)

  return destinoAtualizado
}

/** Atualiza o item em todas as listagens infinitas do Kanban (balcão + delivery). */
export function patchKanbanVendasListagemCache(
  queryClient: QueryClient,
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  let encontrou = false

  const queriesBalcao = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
    kanbanVendasUnificadasInfiniteQueryFilter()
  )
  for (const [queryKey] of queriesBalcao) {
    if (patchVendaUnificadaInfiniteCache(queryClient, queryKey, vendaId, patch)) {
      encontrou = true
    }
  }

  const queriesDelivery = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )
  for (const [queryKey] of queriesDelivery) {
    if (patchVendaUnificadaInfiniteCache(queryClient, queryKey, vendaId, patch)) {
      encontrou = true
    }
  }

  return encontrou
}

/**
 * Atualiza listagem do Kanban e o cache do modal de detalhes (aba Fiscal),
 * para rejeições/autorizações refletirem sem reload da página.
 */
export function patchKanbanVendasListagemEDetalheFiscal(
  queryClient: QueryClient,
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  const encontrou = patchKanbanVendasListagemCache(queryClient, vendaId, patch)
  patchVendaDetalheResumoFiscalCache(queryClient, vendaId, patch)
  return encontrou
}

/** Atualiza um item no cache infinito do Kanban sem refetch da lista inteira. */
export function patchVendaUnificadaInfiniteCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  let encontrou = false

  queryClient.setQueryData<InfiniteData<VendasUnificadasResponse>>(queryKey, atual => {
    if (!atual?.pages?.length) return atual

    const pages = atual.pages.map(page => ({
      ...page,
      items: page.items.map(item => {
        if (item.id !== vendaId) return item
        encontrou = true
        return cloneVendaUnificadaDTO(item, patch)
      }),
    }))

    return encontrou ? { ...atual, pages } : atual
  })

  return encontrou
}

/** Sincroniza pedido delivery gestor via GET leve (substitui refetch da lista inteira). */
export async function sincronizarPedidoDeliveryKanbanEmBackground(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return

    const data = await response.json()
    syncPedidoDeliveryDetalheCaches(queryClient, queryKey, vendaId, data)
    patchVendaUnificadaInfiniteCache(
      queryClient,
      queryKey,
      vendaId,
      extrairPatchKanbanDeRespostaTransicao(data)
    )
  } catch {
    /* falha silenciosa — cache otimista + patch da transição já atualizaram a UI */
  }
}

/**
 * A listagem GET /delivery/pedidos (summary) não inclui `observacoes`.
 * Ao refetch, preserva observações já presentes no cache do Kanban (patch local ou unificado).
 */
export function preservarObservacoesKanbanCacheNosItems(
  queryClient: QueryClient,
  novosItems: VendaUnificadaDTO[]
): VendaUnificadaDTO[] {
  const observacoesPorId = new Map<string, string[]>()

  const coletarObservacoes = (
    queries: [readonly unknown[], InfiniteData<VendasUnificadasResponse> | undefined][]
  ) => {
    for (const [, data] of queries) {
      if (!data?.pages?.length) continue
      for (const page of data.pages) {
        for (const item of page.items) {
          if (item.observacoes?.length) {
            observacoesPorId.set(item.id, item.observacoes)
          }
        }
      }
    }
  }

  coletarObservacoes(
    queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
      kanbanVendasUnificadasInfiniteQueryFilter()
    )
  )
  coletarObservacoes(
    queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
      kanbanPedidosDeliveryInfiniteQueryFilter()
    )
  )

  if (observacoesPorId.size === 0) return novosItems

  return novosItems.map(item => {
    if (item.observacoes?.length) return item
    const cached = observacoesPorId.get(item.id)
    if (!cached?.length) return item
    return cloneVendaUnificadaDTO(item, { observacoes: cached })
  })
}

/** Sincroniza uma venda gestor via GET leve (substitui refetch da lista inteira). */
export async function sincronizarVendaGestorKanbanEmBackground(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`/api/vendas/gestor/${vendaId}?incluirFiscal=false`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return

    const data = await response.json()
    patchVendaUnificadaInfiniteCache(
      queryClient,
      queryKey,
      vendaId,
      extrairPatchKanbanDeRespostaTransicao(data)
    )
  } catch {
    /* falha silenciosa — cache otimista + patch da transição já atualizaram a UI */
  }
}

function isoOuNull(valor: unknown): string | null {
  if (valor == null) return null
  const texto = String(valor).trim()
  return texto || null
}

function numeroOuNull(valor: unknown): number | null {
  if (valor == null || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

/** Extrai campos fiscais de GET venda/pedido (incluirFiscal) ou resposta de emitir/reemitir. */
export function extrairPatchFiscalKanban(data: unknown): KanbanVendaCachePatch {
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const rf =
    root.resumoFiscal && typeof root.resumoFiscal === 'object' && !Array.isArray(root.resumoFiscal)
      ? (root.resumoFiscal as Record<string, unknown>)
      : null

  const statusRaw =
    isoOuNull(root.statusFiscal) ??
    isoOuNull(root.status) ??
    isoOuNull(rf?.status) ??
    isoOuNull(rf?.statusFiscal)

  const modeloRaw = numeroOuNull(root.modelo) ?? numeroOuNull(rf?.modelo)
  const tipoDocRaw = isoOuNull(root.tipoDocFiscal) ?? isoOuNull(root.tipoDocumento)
  let tipoDocFiscal: string | null | undefined = tipoDocRaw ?? undefined
  if (!tipoDocFiscal && (modeloRaw === 55 || modeloRaw === 65)) {
    tipoDocFiscal = modeloRaw === 55 ? 'NFE' : 'NFCE'
  }

  const etapaRaw =
    isoOuNull(root.etapaKanbanBalcao) ?? isoOuNull(root.etapa_kanban_balcao)
  const etapaNorm = String(etapaRaw ?? '')
    .trim()
    .toUpperCase()
  const etapaKanbanBalcao: KanbanVendaCachePatch['etapaKanbanBalcao'] =
    etapaNorm === 'FINALIZADAS' ||
    etapaNorm === 'PENDENTE_EMISSAO' ||
    etapaNorm === 'COM_FISCAL' ||
    etapaNorm === 'REJEITADAS'
      ? etapaNorm
      : undefined

  return {
    statusFiscal: statusRaw,
    documentoFiscalId:
      isoOuNull(root.documentoFiscalId) ?? isoOuNull(rf?.documentoFiscalId) ?? undefined,
    numeroFiscal: numeroOuNull(root.numeroFiscal) ?? numeroOuNull(rf?.numero) ?? undefined,
    serieFiscal:
      numeroOuNull(root.serieFiscal) ??
      numeroOuNull(root.serie) ??
      numeroOuNull(rf?.serie) ??
      undefined,
    dataEmissaoFiscal:
      isoOuNull(root.dataEmissaoFiscal) ?? isoOuNull(rf?.dataEmissao) ?? undefined,
    tipoDocFiscal: tipoDocFiscal ?? undefined,
    modelo: modeloRaw ?? undefined,
    retornoSefaz:
      isoOuNull(root.retornoSefaz) ??
      isoOuNull(root.mensagemSefaz) ??
      isoOuNull(root.mensagemAmigavel) ??
      isoOuNull(rf?.retornoSefaz) ??
      undefined,
    ...(etapaKanbanBalcao ? { etapaKanbanBalcao } : {}),
  }
}

function encontrarVendaNasListagensKanban(
  queryClient: QueryClient,
  vendaId: string
): VendaUnificadaDTO | null {
  const queries = [
    ...queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
      kanbanVendasUnificadasInfiniteQueryFilter()
    ),
    ...queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>(
      kanbanPedidosDeliveryInfiniteQueryFilter()
    ),
  ]

  for (const [, data] of queries) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find(i => i.id === vendaId)
      if (found) return found
    }
  }
  return null
}

const COLUNAS_FISCAIS_BALCAO: EtapaKanbanBalcao[] = [
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'COM_FISCAL',
  'REJEITADAS',
]

/**
 * Atualiza status fiscal no cache e move o card entre colunas do balcão
 * sem refetch das listagens.
 */
export function aplicarPatchFiscalKanbanSemRefetch(
  queryClient: QueryClient,
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  const venda = encontrarVendaNasListagensKanban(queryClient, vendaId)
  let atualizouListagem = false

  if (!venda) {
    atualizouListagem = patchKanbanVendasListagemCache(queryClient, vendaId, patch)
  } else {
    const atualizada = cloneVendaUnificadaDTO(venda, patch)
    const etapa = atualizada.getEtapaKanban()
    if ((COLUNAS_FISCAIS_BALCAO as string[]).includes(etapa)) {
      atualizouListagem = moveVendaKanbanBalcaoEntreColunas(
        queryClient,
        vendaId,
        etapa as EtapaKanbanBalcao,
        patch
      )
    } else {
      atualizouListagem = patchKanbanVendasListagemCache(queryClient, vendaId, patch)
    }
  }

  patchVendaDetalheResumoFiscalCache(queryClient, vendaId, patch)
  return atualizouListagem
}

/** GET leve com fiscal para sincronizar um card após emitir/reemitir. */
export async function sincronizarStatusFiscalVendaKanban(
  queryClient: QueryClient,
  venda: Pick<VendaUnificadaDTO, 'id' | 'tabelaOrigem' | 'tipoVenda'>,
  token: string,
  options?: { atualizarCache?: boolean; moverColuna?: boolean }
): Promise<KanbanVendaCachePatch | null> {
  try {
    const tipo = String(venda.tipoVenda ?? '')
      .trim()
      .toLowerCase()
    const usarDelivery =
      venda.tabelaOrigem === 'venda_gestor' && (tipo === 'entrega' || tipo === 'retirada')

    const url = usarDelivery
      ? `/api/delivery/pedidos/${encodeURIComponent(venda.id)}`
      : venda.tabelaOrigem === 'venda_gestor'
        ? `/api/vendas/gestor/${encodeURIComponent(venda.id)}?incluirFiscal=true`
        : `/api/vendas/${encodeURIComponent(venda.id)}?incluirFiscal=true`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return null

    const data = await response.json()
    const patch = extrairPatchFiscalKanban(data)
    if (!patch.statusFiscal && patch.documentoFiscalId === undefined) return null

    if (options?.atualizarCache !== false) {
      if (options?.moverColuna === false) {
        patchKanbanVendasListagemEDetalheFiscal(queryClient, venda.id, patch)
      } else {
        aplicarPatchFiscalKanbanSemRefetch(queryClient, venda.id, patch)
      }
    }
    return patch
  } catch {
    return null
  }
}
