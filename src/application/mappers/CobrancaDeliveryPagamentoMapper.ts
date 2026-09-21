import { atorUsuarioId, rotuloAtorPedido } from '@/src/application/mappers/atorPedidoDelivery'
import type { PagamentoApiItem } from '@/src/application/dto/api/vendaGestorApi'
import { mapearPagamentoDetalheVenda } from '@/src/application/mappers/VendaDetalhePagamentoMapper'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

function texto(value: unknown): string {
  return value != null ? String(value).trim() : ''
}

function isoString(value: unknown): string | null {
  const s = texto(value)
  return s || null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function extrairNomeMeioPagamentoDeCobranca(raw: Record<string, unknown>): string {
  const nested = asRecord(raw.meioPagamento)
  const pagamentoEfetivado = asRecord(raw.pagamentoEfetivado)
  const nestedEfetivado = asRecord(pagamentoEfetivado?.meioPagamento)
  return (
    texto(nested?.nome) ||
    texto(raw.nomeMeioPagamento) ||
    texto(raw.nome) ||
    texto(nestedEfetivado?.nome) ||
    texto(pagamentoEfetivado?.nomeMeioPagamento) ||
    texto(pagamentoEfetivado?.nome)
  )
}

/**
 * Interpreta cobrança do módulo delivery como pagamento do Gestor.
 * Única conversão cobrança → pagamento usada em detalhe, cupom e lista.
 */
export function mapCobrancaDeliveryToPagamento(raw: unknown): PagamentoApiItem | null {
  const c = asRecord(raw)
  if (!c) return null

  const momento = texto(c.momentoCobranca ?? c.momento_cobranca).toLowerCase()
  const status = texto(c.status).toLowerCase()
  const cancelado = status === 'cancelada' || isoString(c.dataCancelamento) != null
  const paga = status === 'paga'

  const pagamentoEfetivado = asRecord(c.pagamentoEfetivado)

  const efetivada = paga || pagamentoEfetivado != null
  const cobrarNaEntrega = !efetivada && !cancelado && momento === 'na_entrega'

  const meioPagamentoNested = asRecord(c.meioPagamento)
  const meioPagamentoId = texto(
    c.meioPagamentoId ??
      c.meio_pagamento_id ??
      pagamentoEfetivado?.meioPagamentoId ??
      meioPagamentoNested?.id
  )
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

  const realizadoPorNested = asRecord(pagamentoEfetivado?.realizadoPor)
  const atorPagamento =
    realizadoPorNested ??
    c.criadaPor ??
    c.criadoPor ??
    c.lancadaPor ??
    c.abertaPor
  const realizadoPorIdEfetivado = texto(pagamentoEfetivado?.realizadoPorId)
  const realizadoPorId =
    atorUsuarioId(atorPagamento) ||
    texto(c.criadaPorId) ||
    texto(c.criadoPorId) ||
    realizadoPorIdEfetivado ||
    null
  const realizadoPorNome = rotuloAtorPedido(atorPagamento)
  const nomeMeio = extrairNomeMeioPagamentoDeCobranca(c)

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
    realizadoPorId: realizadoPorId || undefined,
    realizadoPorNome: realizadoPorNome || undefined,
    realizadoPor: atorPagamento ?? undefined,
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
    ...(nomeMeio ? { meioPagamento: { id: meioPagamentoId, nome: nomeMeio } } : {}),
  }
}

export function nomesMeiosPagamentoDeVendaDelivery(
  vendaData: Record<string, unknown>
): Record<string, string> {
  const nomes: Record<string, string> = {}

  const anexar = (raw: unknown) => {
    const r = asRecord(raw)
    if (!r) return
    const nested = asRecord(r.meioPagamento)
    const meioId = texto(r.meioPagamentoId ?? r.meio_pagamento_id ?? nested?.id)
    const nome = extrairNomeMeioPagamentoDeCobranca(r)
    if (meioId && nome) nomes[meioId] = nome
  }

  const cobrancas = Array.isArray(vendaData.cobrancas) ? vendaData.cobrancas : []
  for (const cobranca of cobrancas) anexar(cobranca)

  const pagamentos = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  for (const pagamento of pagamentos) anexar(pagamento)

  return nomes
}

/** Pagamentos já mapeados no GET, ou derivados da cobrança delivery. */
export function pagamentosDeVendaDeliveryParaTroco(
  vendaData: Record<string, unknown>
): PagamentoSelecionado[] {
  const pagamentosApi = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
  if (pagamentosApi.length > 0) {
    return pagamentosApi.map(pag =>
      mapearPagamentoDetalheVenda((pag ?? {}) as Record<string, unknown>)
    )
  }

  const cobrancas = Array.isArray(vendaData.cobrancas) ? vendaData.cobrancas : []
  return cobrancas
    .map(mapCobrancaDeliveryToPagamento)
    .filter((p): p is PagamentoApiItem => p != null)
    .map(p => mapearPagamentoDetalheVenda(p as Record<string, unknown>))
}
