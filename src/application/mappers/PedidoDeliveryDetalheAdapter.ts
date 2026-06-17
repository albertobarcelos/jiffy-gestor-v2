import type {
  PagamentoApiItem,
  ProdutoLancadoApiItem,
  VendaGestorApiResponse,
} from '@/src/application/dto/api/vendaGestorApi'

function isoString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function atorUsuarioId(ator: unknown): string | null {
  if (!ator || typeof ator !== 'object') return null
  const a = ator as Record<string, unknown>
  const ref = String(a.sourceReference ?? a.id ?? '').trim()
  return ref || null
}

function mapCobrancaDeliveryToPagamento(raw: unknown): PagamentoApiItem | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const momento = String(c.momentoCobranca ?? '').trim().toLowerCase()
  const status = String(c.status ?? '').trim().toLowerCase()
  const cancelado = status === 'cancelada' || isoString(c.dataCancelamento) != null
  const paga = status === 'paga'

  const pagamentoEfetivado =
    c.pagamentoEfetivado && typeof c.pagamentoEfetivado === 'object'
      ? (c.pagamentoEfetivado as Record<string, unknown>)
      : null

  const efetivada = paga || pagamentoEfetivado != null
  const cobrarNaEntrega = !efetivada && !cancelado && momento === 'na_entrega'

  const meioPagamentoId = String(
    c.meioPagamentoId ?? pagamentoEfetivado?.meioPagamentoId ?? ''
  ).trim()
  if (!meioPagamentoId) return null

  const isTefUsed =
    pagamentoEfetivado?.isTefUsed === true || pagamentoEfetivado?.is_tef_used === true
  let isTefConfirmed: boolean | undefined
  if (isTefUsed) {
    if (pagamentoEfetivado?.isTefConfirmed === true || pagamentoEfetivado?.is_tef_confirmed === true) {
      isTefConfirmed = true
    } else if (
      pagamentoEfetivado?.isTefConfirmed === false ||
      pagamentoEfetivado?.is_tef_confirmed === false
    ) {
      isTefConfirmed = false
    }
  }

  const realizadoPorNested =
    pagamentoEfetivado?.realizadoPor && typeof pagamentoEfetivado.realizadoPor === 'object'
      ? (pagamentoEfetivado.realizadoPor as Record<string, unknown>)
      : null

  return {
    id: c.id != null ? String(c.id) : undefined,
    meioPagamentoId,
    valor: typeof c.valor === 'number' ? c.valor : Number(c.valor) || 0,
    cobrarNaEntrega,
    efetivado: efetivada,
    cancelado,
    dataCancelamento: isoString(c.dataCancelamento),
    dataCriacao: isoString(c.dataCriacao),
    canceladoPorId: atorUsuarioId(c.canceladaPor),
    realizadoPorId:
      pagamentoEfetivado?.realizadoPorId != null
        ? String(pagamentoEfetivado.realizadoPorId)
        : realizadoPorNested
          ? atorUsuarioId(realizadoPorNested)
          : undefined,
    isTefUsed,
    isTefConfirmed,
    tefIdentifier:
      pagamentoEfetivado?.tefIdentifier != null
        ? String(pagamentoEfetivado.tefIdentifier)
        : pagamentoEfetivado?.tef_identifier != null
          ? String(pagamentoEfetivado.tef_identifier)
          : undefined,
    tefAdquirente:
      pagamentoEfetivado?.tefAdquirente != null
        ? String(pagamentoEfetivado.tefAdquirente)
        : pagamentoEfetivado?.tef_adquirente != null
          ? String(pagamentoEfetivado.tef_adquirente)
          : undefined,
  }
}

/**
 * Normaliza `GET /delivery/pedidos/{id}` para o shape consumido por `CarregarVendaDetalheUseCase`.
 */
/** Deriva status financeiro do GET delivery para Kanban / lista unificada. */
export function extrairStatusFinanceiroPedidoDelivery(raw: unknown): string | null {
  const registro =
    raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).data != null &&
        typeof (raw as Record<string, unknown>).data === 'object' &&
        !Array.isArray((raw as Record<string, unknown>).data)
          ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
          : (raw as Record<string, unknown>))
      : null

  if (!registro) return null

  const pagamento =
    registro.pagamento && typeof registro.pagamento === 'object'
      ? (registro.pagamento as Record<string, unknown>)
      : null
  const statusPagamento = String(pagamento?.status ?? '').trim().toLowerCase()
  if (statusPagamento === 'pago' || statusPagamento === 'parcial' || statusPagamento === 'pendente') {
    return statusPagamento
  }

  const totalFaltaPagar = Number(registro.totalFaltaPagar ?? 0) || 0
  return totalFaltaPagar <= 0 ? 'pago' : 'pendente'
}

export function adaptPedidoDeliveryToVendaGestorApiResponse(
  raw: unknown
): VendaGestorApiResponse {
  const registro =
    raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).data != null &&
        typeof (raw as Record<string, unknown>).data === 'object' &&
        !Array.isArray((raw as Record<string, unknown>).data)
          ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
          : (raw as Record<string, unknown>))
      : {}

  const cliente =
    registro.cliente && typeof registro.cliente === 'object'
      ? (registro.cliente as Record<string, unknown>)
      : null

  const entregador =
    registro.entregador && typeof registro.entregador === 'object'
      ? (registro.entregador as Record<string, unknown>)
      : null

  const tipoEntrega = String(registro.tipoEntrega ?? registro.tipoVenda ?? '')
    .trim()
    .toLowerCase()

  const cobrancas = Array.isArray(registro.cobrancas) ? registro.cobrancas : []
  const pagamentos = cobrancas
    .map(mapCobrancaDeliveryToPagamento)
    .filter((p): p is PagamentoApiItem => p != null)

  const produtosLancados = Array.isArray(registro.produtosLancados)
    ? (registro.produtosLancados as ProdutoLancadoApiItem[])
    : []

  const dataFinalizacao = isoString(registro.dataFinalizacao)
  const statusDelivery = String(registro.statusDelivery ?? '').trim().toUpperCase()

  const totalFaltaPagar = Number(registro.totalFaltaPagar ?? 0) || 0
  const cobrarNaEntregaPendente = cobrancas.some(c => {
    if (!c || typeof c !== 'object') return false
    const cob = c as Record<string, unknown>
    const momento = String(cob.momentoCobranca ?? '').toLowerCase()
    const status = String(cob.status ?? '').toLowerCase()
    return momento === 'na_entrega' && status !== 'paga' && status !== 'cancelada'
  })

  const pedidoDeliveryFinalizado = statusDelivery === 'FINALIZADO'

  return {
    ...registro,
    id: registro.id != null ? String(registro.id) : undefined,
    origem: registro.origem != null ? String(registro.origem) : 'GESTOR',
    tipoVenda: tipoEntrega || String(registro.tipoVenda ?? ''),
    statusVenda: dataFinalizacao || pedidoDeliveryFinalizado ? 'FINALIZADA' : 'ABERTA',
    statusEtapaOperacional: statusDelivery || undefined,
    statusOperacional: statusDelivery || undefined,
    clienteId: cliente?.id != null ? String(cliente.id) : undefined,
    cliente,
    entregadorId: entregador?.id != null ? String(entregador.id) : undefined,
    entregador,
    produtosLancados,
    produtos: produtosLancados,
    pagamentos,
    observacoes: Array.isArray(registro.observacoes) ? registro.observacoes : [],
    previsaoEntrega: isoString(registro.previsaoEntregaEm ?? registro.previsaoEntrega),
    dataPronto: isoString(registro.dataFinalizacaoPreparo),
    dataInicioPreparo: isoString(registro.dataInicioPreparo),
    dataSaidaEntrega: isoString(registro.dataSaidaEntrega),
    dataCriacao: isoString(registro.dataCriacao),
    dataFinalizacao,
    dataCancelamento: isoString(registro.dataCancelamento),
    dataUltimaModificacao: isoString(registro.dataUltimaModificacao),
    dataUltimoProdutoLancado: isoString(registro.dataUltimoProdutoLancado),
    abertoPorId: atorUsuarioId(registro.abertoPor),
    ultimoResponsavelId: atorUsuarioId(registro.ultimoResponsavel),
    canceladoPorId: atorUsuarioId(registro.canceladoPor),
    valorFinal: registro.valorFinal as VendaGestorApiResponse['valorFinal'],
    troco: registro.troco as VendaGestorApiResponse['troco'],
    totalDesconto: registro.totalDesconto,
    totalAcrescimo: registro.totalAcrescimo,
    taxasLancadas: Array.isArray(registro.taxasLancadas) ? registro.taxasLancadas : [],
    pagamento: {
      status: totalFaltaPagar > 0 ? 'pendente' : 'pago',
      cobrarCliente: cobrarNaEntregaPendente,
      valorReceber: Number(registro.valorFinal ?? 0) || 0,
      valorRecebido: Number(registro.totalPago ?? 0) || 0,
      valorFaltante: totalFaltaPagar,
    },
  }
}

export function deveUsarModuloDeliveryParaDetalhe(
  tabelaOrigem: 'venda' | 'venda_gestor',
  tipoVenda?: string | null
): boolean {
  if (tabelaOrigem !== 'venda_gestor') return false
  const tipo = String(tipoVenda ?? '').trim().toLowerCase()
  if (!tipo || tipo === 'balcao') return false
  return tipo === 'entrega' || tipo === 'retirada'
}
