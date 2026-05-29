import { mapearPagamentoDetalheVenda, pagamentoEstaCancelado } from '../novo-pedido/novoPedidoPagamentoHelpers'
import {
  calcularTotalDosItensResumoEntrega,
  formatarTipoPagamentoDetalhe,
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
  resolverTaxaEntregaValorSync,
  resolverTrocoLevarPedidoEntrega,
} from '../novo-pedido/novoPedidoDetalheHelpers'
import type { DetalhesEntregaPedido, FluxoPagamentoEntrega, PagamentoSelecionado } from '../novo-pedido/types'

export interface ProdutoKanbanQuickView {
  nome: string
  quantidade: number
  complementos: Array<{ nome: string; quantidade: number }>
}

export interface PedidoKanbanQuickViewData {
  numeroVenda: number | null
  codigoVenda: string | null
  dataCriacao: string | null
  detalhesEntrega: DetalhesEntregaPedido
  clienteNome: string
  nomeEntregador: string
  telefoneEntregador: string | null
  produtos: ProdutoKanbanQuickView[]
  totalItens: number
  taxaEntrega: number
  totalAReceber: number
  troco: number
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
  tipoPagamento: string
}

const QUICK_VIEW_CACHE = new Map<string, PedidoKanbanQuickViewData>()
const QUICK_VIEW_INFLIGHT = new Map<string, Promise<PedidoKanbanQuickViewData>>()

const FETCH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

function quickViewCacheKey(vendaId: string, tabelaOrigem: 'venda' | 'venda_gestor'): string {
  return `${tabelaOrigem}:${vendaId}`
}

export function obterPedidoKanbanQuickViewCache(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
}): PedidoKanbanQuickViewData | null {
  return QUICK_VIEW_CACHE.get(quickViewCacheKey(args.vendaId, args.tabelaOrigem)) ?? null
}

function calcularTotalAReceberPagamentos(pagamentos: PagamentoSelecionado[]): number {
  const total = pagamentos
    .filter(p => !pagamentoEstaCancelado(p))
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0)
  return total > 0 ? Math.round(total * 100) / 100 : 0
}

function resolverFluxoPagamentoEntrega(
  pagamentos: PagamentoSelecionado[],
  pagamentoEntregaApi: Record<string, unknown> | null
): FluxoPagamentoEntrega {
  if (pagamentos.length > 0) {
    return pagamentos.some(pag => pag.cobrarNaEntrega) ? 'cobrar_entregador' : 'ja_pago'
  }

  const meiosCobrancaApi = Array.isArray(pagamentoEntregaApi?.meios)
    ? (pagamentoEntregaApi.meios as Record<string, unknown>[])
    : []

  if (meiosCobrancaApi.length > 0) {
    return 'cobrar_entregador'
  }

  if (
    pagamentoEntregaApi?.cobrarCliente === true ||
    String(pagamentoEntregaApi?.status ?? '').toLowerCase() === 'pendente'
  ) {
    return 'cobrar_entregador'
  }

  return 'ja_pago'
}

function mapearProdutosKanbanQuickView(vendaData: Record<string, unknown>): ProdutoKanbanQuickView[] {
  const produtosRaw = vendaData.produtosLancados || vendaData.produtos
  if (!Array.isArray(produtosRaw)) return []

  return produtosRaw
    .filter(raw => raw && typeof raw === 'object' && !(raw as Record<string, unknown>).removido)
    .map(raw => {
      const prod = raw as Record<string, unknown>
      const nome = String(prod.nomeProduto ?? prod.nome ?? 'Produto').trim() || 'Produto'
      const quantidade = Number(prod.quantidade) || 1
      const complementosRaw = Array.isArray(prod.complementos) ? prod.complementos : []

      const complementos = complementosRaw
        .filter(compRaw => compRaw && typeof compRaw === 'object')
        .map(compRaw => {
          const comp = compRaw as Record<string, unknown>
          return {
            nome: String(comp.nomeComplemento ?? comp.nome ?? 'Complemento').trim() || 'Complemento',
            quantidade: Number(comp.quantidade) || 1,
          }
        })

      return { nome, quantidade, complementos }
    })
}

async function resolverNomesMeiosPagamentoQuickView(args: {
  pagamentosApi: unknown[]
  meiosCobrancaApi: Record<string, unknown>[]
  token: string
}): Promise<Record<string, string>> {
  const { pagamentosApi, meiosCobrancaApi, token } = args
  const mapMeios: Record<string, string> = {}
  const idsMeios = new Set<string>()

  for (const pagRaw of pagamentosApi) {
    if (!pagRaw || typeof pagRaw !== 'object') continue
    const pag = pagRaw as Record<string, unknown>
    const meioId = String(pag.meioPagamentoId ?? pag.meio_pagamento_id ?? '').trim()
    if (meioId) idsMeios.add(meioId)

    const meioObj = pag.meioPagamento
    if (meioObj && typeof meioObj === 'object') {
      const nome = String((meioObj as Record<string, unknown>).nome ?? '').trim()
      if (meioId && nome) mapMeios[meioId] = nome
    }
  }

  for (const meio of meiosCobrancaApi) {
    const meioId = String(meio.meioPagamentoId ?? meio.id ?? '').trim()
    if (meioId) idsMeios.add(meioId)
    const nome = String(meio.nome ?? meio.nomeMeioPagamento ?? '').trim()
    if (meioId && nome) mapMeios[meioId] = nome
  }

  await Promise.all(
    Array.from(idsMeios)
      .filter(meioId => !mapMeios[meioId])
      .map(async meioId => {
        const data = await fetchJsonRecord(`/api/meios-pagamentos/${meioId}`, token)
        if (!data) return
        const nome = String(data.nome ?? data.name ?? '').trim()
        if (nome) mapMeios[meioId] = nome
      })
  )

  return mapMeios
}

async function fetchJsonRecord(
  url: string,
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS(token) })
    if (!response.ok) return null
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

async function carregarPedidoKanbanQuickViewInterno(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  token: string
}): Promise<PedidoKanbanQuickViewData> {
  const { vendaId, tabelaOrigem, token } = args

  const urlVenda =
    tabelaOrigem === 'venda'
      ? `/api/vendas/${vendaId}?incluirFiscal=false`
      : `/api/vendas/gestor/${vendaId}?incluirFiscal=false`

  const response = await fetch(urlVenda, { headers: FETCH_HEADERS(token) })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        'Erro ao carregar dados do pedido'
    )
  }

  const vendaData = (await response.json()) as Record<string, unknown>
  let detalhesEntrega = mapDetalhesEntregaFromVendaApi(vendaData)
  let clienteNome = detalhesEntrega.clienteNome?.trim() || ''

  const clienteIdVenda = String(vendaData.clienteId ?? '').trim()
  const entregadorIdVenda = String(vendaData.entregadorId ?? '').trim()

  const [clienteData, entregadorData] = await Promise.all([
    clienteIdVenda
      ? fetchJsonRecord(`/api/clientes/${clienteIdVenda}`, token)
      : Promise.resolve(null),
    entregadorIdVenda
      ? fetchJsonRecord(`/api/usuarios/${entregadorIdVenda}`, token)
      : Promise.resolve(null),
  ])

  if (clienteData) {
    clienteNome =
      String(clienteData.nome ?? clienteData.name ?? '').trim() ||
      clienteNome ||
      '—'
    detalhesEntrega = mergeClienteDetalhesEntrega(detalhesEntrega, clienteData) ?? detalhesEntrega
  }

  let nomeEntregador = detalhesEntrega.entregadorNome?.trim() || ''
  let telefoneEntregador: string | null = null

  if (entregadorData) {
    nomeEntregador = String(entregadorData.nome ?? entregadorData.name ?? '').trim()
    const telefone = String(entregadorData.telefone ?? entregadorData.celular ?? '').trim()
    telefoneEntregador = telefone || null
    if (nomeEntregador) {
      detalhesEntrega = { ...detalhesEntrega, entregadorNome: nomeEntregador }
    }
  }

  const totalItens = calcularTotalDosItensResumoEntrega(vendaData)
  const taxaEntrega = resolverTaxaEntregaValorSync(vendaData, totalItens)

  const numeroVendaRaw = vendaData.numeroVenda
  const numeroVenda =
    numeroVendaRaw != null && !Number.isNaN(Number(numeroVendaRaw))
      ? Number(numeroVendaRaw)
      : null
  const codigoVenda =
    vendaData.codigoVenda != null ? String(vendaData.codigoVenda).trim() || null : null
  const dataCriacao =
    vendaData.dataCriacao != null ? String(vendaData.dataCriacao) : null

  const pagamentosApi = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  const pagamentoEntregaApi =
    vendaData.pagamento && typeof vendaData.pagamento === 'object'
      ? (vendaData.pagamento as Record<string, unknown>)
      : null
  const meiosCobrancaApi = Array.isArray(pagamentoEntregaApi?.meios)
    ? (pagamentoEntregaApi.meios as Record<string, unknown>[])
    : []

  let pagamentos: PagamentoSelecionado[] = []
  if (pagamentosApi.length > 0) {
    pagamentos = pagamentosApi.map(pag =>
      mapearPagamentoDetalheVenda(pag as Record<string, unknown>)
    )
  } else if (meiosCobrancaApi.length > 0) {
    pagamentos = meiosCobrancaApi
      .map(meio => ({
        id: meio.id != null ? String(meio.id) : undefined,
        meioPagamentoId: String(meio.meioPagamentoId ?? meio.id ?? '').trim(),
        valor: Number(meio.valor ?? 0) || 0,
        cobrarNaEntrega: true,
      }))
      .filter(pag => pag.meioPagamentoId && pag.valor > 0)
  }

  const fluxoPagamentoEntrega = resolverFluxoPagamentoEntrega(
    pagamentos,
    pagamentoEntregaApi
  )

  const troco = resolverTrocoLevarPedidoEntrega(vendaData, pagamentos)
  const totalAReceber = calcularTotalAReceberPagamentos(pagamentos)
  const nomesMeiosPagamento = await resolverNomesMeiosPagamentoQuickView({
    pagamentosApi,
    meiosCobrancaApi,
    token,
  })
  const tipoPagamento = formatarTipoPagamentoDetalhe(pagamentos, [], nomesMeiosPagamento)

  return {
    numeroVenda,
    codigoVenda,
    dataCriacao,
    detalhesEntrega,
    clienteNome: clienteNome || '—',
    nomeEntregador: nomeEntregador || '—',
    telefoneEntregador,
    produtos: mapearProdutosKanbanQuickView(vendaData),
    totalItens,
    taxaEntrega,
    totalAReceber,
    troco: troco > 0 ? troco : 0,
    fluxoPagamentoEntrega,
    tipoPagamento,
  }
}

export async function carregarPedidoKanbanQuickView(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  token: string
  /** Quando true, ignora cache em memória e busca dados frescos. */
  forcarAtualizacao?: boolean
}): Promise<PedidoKanbanQuickViewData> {
  const { vendaId, tabelaOrigem, token, forcarAtualizacao = false } = args
  const cacheKey = quickViewCacheKey(vendaId, tabelaOrigem)

  if (!forcarAtualizacao) {
    const cached = QUICK_VIEW_CACHE.get(cacheKey)
    if (cached) return cached

    const inflight = QUICK_VIEW_INFLIGHT.get(cacheKey)
    if (inflight) return inflight
  }

  const promise = carregarPedidoKanbanQuickViewInterno({ vendaId, tabelaOrigem, token })
    .then(resultado => {
      QUICK_VIEW_CACHE.set(cacheKey, resultado)
      return resultado
    })
    .finally(() => {
      QUICK_VIEW_INFLIGHT.delete(cacheKey)
    })

  QUICK_VIEW_INFLIGHT.set(cacheKey, promise)
  return promise
}

export function invalidarPedidoKanbanQuickViewCache(vendaId: string): void {
  QUICK_VIEW_CACHE.delete(quickViewCacheKey(vendaId, 'venda'))
  QUICK_VIEW_CACHE.delete(quickViewCacheKey(vendaId, 'venda_gestor'))
}
