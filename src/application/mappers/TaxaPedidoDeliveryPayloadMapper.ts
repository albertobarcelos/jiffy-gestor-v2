import type {
  CobrancaPedidoDeliveryApi,
  SalvarTaxaPedidoDeliveryApi,
  TaxaPedidoDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import {
  extrairTaxaEntregaIdDaVenda,
  taxaLancadaPedidoEstaAtiva,
} from '@/src/application/mappers/VendaDetalheMapper'

/** Taxa de entrega ativa no pedido — fonte de verdade para o PATCH (ignora removidas). */
export interface TaxaEntregaAtivaPedidoRef {
  taxaId: string | null
  valor: number
}

function parseNumeroTaxa(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function extrairTaxaEntregaAtivaPedidoDelivery(
  pedido: Record<string, unknown>
): TaxaEntregaAtivaPedidoRef {
  const taxaId = extrairTaxaEntregaIdDaVenda(pedido)
  if (!taxaId) return { taxaId: null, valor: 0 }

  const taxas = Array.isArray(pedido.taxasLancadas) ? pedido.taxasLancadas : []
  let candidata: Record<string, unknown> | null = null

  for (const raw of taxas) {
    if (!raw || typeof raw !== 'object') continue
    const taxa = raw as Record<string, unknown>
    if (!taxaLancadaPedidoEstaAtiva(taxa)) continue
    if (String(taxa.taxaId ?? taxa.taxa_id ?? '').trim() !== taxaId) continue
    candidata = taxa
    break
  }

  const valor =
    parseNumeroTaxa(candidata?.valorCalculado) ??
    parseNumeroTaxa(candidata?.valorAplicado) ??
    parseNumeroTaxa(candidata?.valor) ??
    0

  return { taxaId, valor: valor > 0 ? valor : 0 }
}

/** Cobrança pendente `na_entrega` resumida — usada para reemitir com o novo valor. */
export interface CobrancaPendenteNaEntregaRef {
  id: string
  valor: number
  meioPagamentoId: string
}

function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

function cobrancaCancelada(c: Record<string, unknown>): boolean {
  const status = String(c.status ?? '').trim().toLowerCase()
  if (status === 'cancelada') return true
  const dataCancelamento = c.dataCancelamento
  return dataCancelamento != null && String(dataCancelamento).trim() !== ''
}

function cobrancaPaga(c: Record<string, unknown>): boolean {
  const status = String(c.status ?? '').trim().toLowerCase()
  if (status === 'paga') return true
  if (status === 'pendente' || status === 'cancelada') return false
  return c.pagamentoEfetivado != null && typeof c.pagamentoEfetivado === 'object'
}

function listarCobrancas(pedido: Record<string, unknown>): Record<string, unknown>[] {
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []
  return cobrancas.filter(
    (raw): raw is Record<string, unknown> => raw != null && typeof raw === 'object'
  )
}

/** Pedido já pago: existe ao menos uma cobrança quitada (não cancelada). */
export function pedidoDeliveryEstaPago(pedido: Record<string, unknown>): boolean {
  return listarCobrancas(pedido).some(c => !cobrancaCancelada(c) && cobrancaPaga(c))
}

/** Cobranças pendentes `na_entrega` (não cancelada e não paga) com valor/meio para reemissão. */
export function extrairCobrancasPendentesNaEntregaPedidoDelivery(
  pedido: Record<string, unknown>
): CobrancaPendenteNaEntregaRef[] {
  return listarCobrancas(pedido)
    .filter(c => !cobrancaCancelada(c) && !cobrancaPaga(c))
    .filter(c => String(c.momentoCobranca ?? '').trim().toLowerCase() === 'na_entrega')
    .map(c => ({
      id: String(c.id ?? '').trim(),
      valor: Number(c.valor ?? 0),
      meioPagamentoId: String(c.meioPagamentoId ?? '').trim(),
    }))
    .filter(c => c.id.length > 0 && c.meioPagamentoId.length > 0)
}

export interface BuildSalvarTaxaPatchArgs {
  /** `taxaId` do catálogo atualmente aplicada (null quando não há taxa). */
  taxaAtualId: string | null
  /** Valor da taxa atual (0 quando não há taxa). */
  taxaAtualValor: number
  /** `taxaId` do catálogo escolhida (null = remover/sem taxa). */
  taxaSelecionadaId: string | null
  /** Valor da taxa escolhida (0 quando "sem taxa"). */
  taxaSelecionadaValor: number
  /** Cobranças pendentes `na_entrega` a reemitir com o novo valor. */
  cobrancasPendentesNaEntrega: CobrancaPendenteNaEntregaRef[]
}

export interface BuildSalvarTaxaPatchResult {
  patch: SalvarTaxaPedidoDeliveryApi
  mudou: boolean
}

/**
 * Monta o PATCH atômico de "Salvar Taxa":
 * - `taxas`: remove a taxa atual (por `taxaId` do catálogo) e/ou adiciona a nova.
 * - `cobrancas`: quando há cobrança pendente `na_entrega`, cancela e reemite com o
 *   novo valor (`valorAtual + delta`) mantendo o mesmo meio de pagamento.
 *
 * Pré-condições garantidas pelo use case: pedido não pago e no máximo 1 cobrança pendente.
 */
export function buildSalvarTaxaPedidoDeliveryPatch(
  args: BuildSalvarTaxaPatchArgs
): BuildSalvarTaxaPatchResult {
  const taxaAtual = args.taxaAtualId?.trim() || null
  const taxaSelecionada = args.taxaSelecionadaId?.trim() || null

  if (taxaAtual === taxaSelecionada) {
    return { patch: {}, mudou: false }
  }

  const taxas: { add?: TaxaPedidoDeliveryApi[]; remove?: string[] } = {}
  if (taxaAtual) taxas.remove = [taxaAtual]
  if (taxaSelecionada) taxas.add = [{ taxaId: taxaSelecionada, quantidade: 1 }]

  const patch: SalvarTaxaPedidoDeliveryApi = { taxas }

  const delta = arredondar2(
    (taxaSelecionada ? args.taxaSelecionadaValor : 0) - (taxaAtual ? args.taxaAtualValor : 0)
  )

  const pendente = args.cobrancasPendentesNaEntrega[0]
  if (delta !== 0 && pendente) {
    const novoValor = arredondar2(pendente.valor + delta)
    const add: CobrancaPedidoDeliveryApi = {
      meioPagamentoId: pendente.meioPagamentoId,
      valor: novoValor,
      momentoCobranca: 'na_entrega',
    }
    patch.cobrancas = {
      cancel: [{ cobrancaId: pendente.id }],
      add: [add],
    }
  }

  return { patch, mudou: true }
}
