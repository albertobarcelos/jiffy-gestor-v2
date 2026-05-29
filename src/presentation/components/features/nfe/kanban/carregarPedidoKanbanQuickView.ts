import { mapearPagamentoDetalheVenda } from '../novo-pedido/novoPedidoPagamentoHelpers'
import {
  calcularTotalDosItensResumoEntrega,
  mapDetalhesEntregaFromVendaApi,
  mergeClienteDetalhesEntrega,
  resolverTaxaEntregaDetalhe,
  taxaEntregaTemValor,
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
  produtos: ProdutoKanbanQuickView[]
  totalItens: number
  taxaEntrega: number
  troco: number
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
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

export async function carregarPedidoKanbanQuickView(args: {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  token: string
}): Promise<PedidoKanbanQuickViewData> {
  const { vendaId, tabelaOrigem, token } = args

  const urlVenda =
    tabelaOrigem === 'venda'
      ? `/api/vendas/${vendaId}?incluirFiscal=true`
      : `/api/vendas/gestor/${vendaId}?incluirFiscal=true`

  const response = await fetch(urlVenda, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

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
  if (clienteIdVenda) {
    try {
      const clienteResponse = await fetch(`/api/clientes/${clienteIdVenda}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (clienteResponse.ok) {
        const clienteData = (await clienteResponse.json()) as Record<string, unknown>
        clienteNome =
          String(clienteData.nome ?? clienteData.name ?? '').trim() ||
          clienteNome ||
          '—'
        detalhesEntrega =
          mergeClienteDetalhesEntrega(detalhesEntrega, clienteData) ?? detalhesEntrega
      }
    } catch {
      // mantém snapshot da venda
    }
  }

  let nomeEntregador = detalhesEntrega.entregadorNome?.trim() || ''
  const entregadorIdVenda = String(vendaData.entregadorId ?? '').trim()
  if (entregadorIdVenda) {
    try {
      const entregadorResponse = await fetch(`/api/usuarios/${entregadorIdVenda}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (entregadorResponse.ok) {
        const entregadorData = (await entregadorResponse.json()) as Record<string, unknown>
        nomeEntregador = String(entregadorData.nome ?? entregadorData.name ?? '').trim()
        if (nomeEntregador) {
          detalhesEntrega = { ...detalhesEntrega, entregadorNome: nomeEntregador }
        }
      }
    } catch {
      // mantém snapshot
    }
  }

  const totalItens = calcularTotalDosItensResumoEntrega(vendaData)
  const taxaEntregaDetalhe = await resolverTaxaEntregaDetalhe(vendaData, token, totalItens)
  const taxaEntrega = taxaEntregaTemValor(taxaEntregaDetalhe)
    ? Number(taxaEntregaDetalhe?.valor)
    : 0
  if (taxaEntregaDetalhe) {
    detalhesEntrega = { ...detalhesEntrega, taxaEntrega: taxaEntregaDetalhe }
  }

  const trocoRaw = vendaData.troco
  const troco =
    trocoRaw !== undefined && trocoRaw !== null && !Number.isNaN(Number(trocoRaw))
      ? Number(trocoRaw)
      : detalhesEntrega.trocoApi ?? 0

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

  return {
    numeroVenda,
    codigoVenda,
    dataCriacao,
    detalhesEntrega,
    clienteNome: clienteNome || '—',
    nomeEntregador: nomeEntregador || '—',
    produtos: mapearProdutosKanbanQuickView(vendaData),
    totalItens,
    taxaEntrega,
    troco: troco > 0 ? troco : 0,
    fluxoPagamentoEntrega,
  }
}
