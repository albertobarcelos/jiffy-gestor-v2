import { atorUsuarioId } from '@/src/application/mappers/atorPedidoDelivery'
import type {
  PagamentoApiItem,
  ProdutoLancadoApiItem,
  VendaGestorApiResponse,
} from '@/src/application/dto/api/vendaGestorApi'
import { mapCobrancaDeliveryToPagamento } from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'
import {
  enderecoSnapshotParaEnderecoEntregaDetalhe,
  extrairContextoEntregaDeVendaData,
} from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import { resolverTrocoLevarPedidoEntrega } from '@/src/application/mappers/resolverTrocoLevarPedidoEntrega'
import { mapearPagamentoDetalheVenda } from '@/src/application/mappers/VendaDetalhePagamentoMapper'

function isoString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
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

  const produtosLancados = (Array.isArray(registro.produtosLancados)
    ? (registro.produtosLancados as ProdutoLancadoApiItem[])
    : []
  ).map(item => {
    const lancadoPorId = atorUsuarioId(item.lancadoPor) ?? String(item.lancadoPorId ?? '').trim()
    const removidoPorId = atorUsuarioId(item.removidoPor) ?? String(item.removidoPorId ?? '').trim()
    return {
      ...item,
      ...(lancadoPorId ? { lancadoPorId } : {}),
      ...(removidoPorId ? { removidoPorId } : {}),
    }
  })

  const dataFinalizacao = isoString(registro.dataFinalizacao)
  const statusDeliveryCandidatos = [
    registro.statusDelivery,
    registro.statusEtapaOperacional,
    registro.statusOperacional,
  ]
  let statusDelivery = ''
  for (const candidato of statusDeliveryCandidatos) {
    const raw = String(candidato ?? '').trim().toUpperCase()
    if (!raw || raw === 'ABERTA' || raw === 'FINALIZADA') continue
    statusDelivery = raw
    break
  }

  const totalFaltaPagar = Number(registro.totalFaltaPagar ?? 0) || 0
  const pagamentosNaEntrega = pagamentos.filter(p => p.cobrarNaEntrega && !p.cancelado)
  const cobrarNaEntregaPendente = pagamentosNaEntrega.length > 0
  const pagamentosSelecionados = pagamentos.map(p =>
    mapearPagamentoDetalheVenda(p as Record<string, unknown>)
  )

  const pedidoDeliveryFinalizado = statusDelivery === 'FINALIZADO'

  const contextoEntrega = extrairContextoEntregaDeVendaData(registro)
  const enderecoSnapshot = contextoEntrega?.enderecoEntrega
    ? enderecoSnapshotParaEnderecoEntregaDetalhe(contextoEntrega.enderecoEntrega)
    : null

  return {
    ...registro,
    contextoEntrega: contextoEntrega ?? registro.contextoEntrega,
    enderecoEntrega: enderecoSnapshot ?? registro.enderecoEntrega,
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
    troco: resolverTrocoLevarPedidoEntrega(registro, pagamentosSelecionados) as VendaGestorApiResponse['troco'],
    totalDesconto: registro.totalDesconto,
    totalAcrescimo: registro.totalAcrescimo,
    taxasLancadas: Array.isArray(registro.taxasLancadas) ? registro.taxasLancadas : [],
    taxaEntregaValor:
      registro.taxaEntregaValor ??
      (registro.resumoPedido && typeof registro.resumoPedido === 'object'
        ? (registro.resumoPedido as Record<string, unknown>).taxaEntrega
        : undefined),
    pagamento: {
      status: totalFaltaPagar > 0 ? 'pendente' : 'pago',
      cobrarCliente: cobrarNaEntregaPendente,
      valorReceber: Number(registro.valorFinal ?? 0) || 0,
      valorRecebido: Number(registro.totalPago ?? 0) || 0,
      valorFaltante: totalFaltaPagar,
      valorCobrarNaEntrega: pagamentosNaEntrega.reduce(
        (soma, p) => soma + (Number(p.valor) || 0),
        0
      ),
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
