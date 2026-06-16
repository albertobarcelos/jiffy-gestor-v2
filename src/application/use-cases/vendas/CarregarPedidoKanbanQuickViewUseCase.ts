import { formatarTipoPagamentoDetalhe } from '@/src/application/mappers/PedidoDisplayMapper'
import {
  calcularTotalDosItensResumoEntrega,
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
  resolverTaxaEntregaValorSync,
  resolverTrocoLevarPedidoEntrega,
} from '@/src/application/mappers/VendaDetalheMapper'
import { mapearPagamentoDetalheVenda } from '@/src/application/mappers/VendaDetalhePagamentoMapper'
import type { VendaGestorApiResponse } from '@/src/application/dto/api/vendaGestorApi'
import { pickProdutosLancados } from '@/src/application/mappers/VendaApiNormalizer'
import type { IVendaDetalheReadRepository } from '@/src/domain/repositories/IVendaDetalheReadRepository'
import { pagamentoEstaCancelado } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import type {
  DetalhesEntregaPedido,
  FluxoPagamentoEntrega,
  TabelaOrigemVenda,
} from '@/src/domain/types/vendaDetalhe'
import { deveUsarModuloDeliveryParaDetalhe } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'

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

  if (meiosCobrancaApi.length > 0) return 'cobrar_entregador'

  if (
    pagamentoEntregaApi?.cobrarCliente === true ||
    String(pagamentoEntregaApi?.status ?? '').toLowerCase() === 'pendente'
  ) {
    return 'cobrar_entregador'
  }

  return 'ja_pago'
}

function mapearProdutosKanbanQuickView(
  vendaData: Record<string, unknown>
): ProdutoKanbanQuickView[] {
  const produtosRaw = pickProdutosLancados(vendaData as VendaGestorApiResponse)

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
            nome:
              String(comp.nomeComplemento ?? comp.nome ?? 'Complemento').trim() || 'Complemento',
            quantidade: Number(comp.quantidade) || 1,
          }
        })

      return { nome, quantidade, complementos }
    })
}

async function resolverNomesMeiosPagamentoQuickView(args: {
  pagamentosApi: unknown[]
  meiosCobrancaApi: Record<string, unknown>[]
  repo: IVendaDetalheReadRepository
  token: string
}): Promise<Record<string, string>> {
  const { pagamentosApi, meiosCobrancaApi, repo, token } = args
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
        const data = await repo.fetchMeioPagamento(meioId, token)
        if (!data) return
        const nome = String(data.nome ?? data.name ?? '').trim()
        if (nome) mapMeios[meioId] = nome
      })
  )

  return mapMeios
}

export class CarregarPedidoKanbanQuickViewUseCase {
  constructor(
    private readonly repo: IVendaDetalheReadRepository = vendaDetalheReadRepository
  ) {}

  async execute(params: {
    vendaId: string
    tabelaOrigem: TabelaOrigemVenda
    token: string
  }): Promise<PedidoKanbanQuickViewData> {
    const { vendaId, tabelaOrigem, token } = params
    const vendaData = (await this.repo.loadVenda(vendaId, tabelaOrigem, token, {
      incluirFiscal: false,
      preferirModuloDelivery: deveUsarModuloDeliveryParaDetalhe(tabelaOrigem),
    })) as Record<string, unknown>

    let detalhesEntrega = mapDetalhesEntregaFromVendaApi(vendaData)
    let clienteNome = detalhesEntrega.clienteNome?.trim() || ''

    const clienteIdVenda = String(vendaData.clienteId ?? '').trim()
    const entregadorIdVenda = String(vendaData.entregadorId ?? '').trim()

    const [clienteData, entregadorData] = await Promise.all([
      clienteIdVenda
        ? this.repo.fetchCliente(clienteIdVenda, token)
        : Promise.resolve(null),
      entregadorIdVenda
        ? this.repo.fetchUsuarioPdv(entregadorIdVenda, token)
        : Promise.resolve(null),
    ])

    if (clienteData) {
      clienteNome =
        String(clienteData.nome ?? clienteData.name ?? '').trim() ||
        clienteNome ||
        '—'
      detalhesEntrega =
        mergeClienteDetalhesEntrega(detalhesEntrega, clienteData) ?? detalhesEntrega
    }

    let nomeEntregador = detalhesEntrega.entregadorNome?.trim() || ''
    let telefoneEntregador: string | null = null

    const entregadorNested =
      vendaData.entregador && typeof vendaData.entregador === 'object'
        ? (vendaData.entregador as Record<string, unknown>)
        : null

    if (entregadorNested) {
      nomeEntregador =
        String(entregadorNested.nome ?? entregadorNested.name ?? '').trim() || nomeEntregador
      const telefone = String(entregadorNested.telefone ?? entregadorNested.celular ?? '').trim()
      telefoneEntregador = telefone || null
      if (nomeEntregador) {
        detalhesEntrega = { ...detalhesEntrega, entregadorNome: nomeEntregador }
      }
    }

    if (!nomeEntregador && entregadorData) {
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
      repo: this.repo,
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
}

export const carregarPedidoKanbanQuickViewUseCase = new CarregarPedidoKanbanQuickViewUseCase()
