import { formatarHoraPrevisaoEntrega } from '@/src/application/mappers/PedidoDisplayMapper'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import type {
  CobrancaKanbanDeliveryResumo,
  VendaUnificadaDTO,
} from '../hooks/useVendasUnificadas'

/** Previsão compacta no card delivery (imediato = texto; agendado = data + janela). */
export type PrevisaoEntregaKanbanCard =
  | { kind: 'agendado'; data: string; horario: string }
  | { kind: 'texto'; texto: string }

export type AgendaSlotDeliveryInput = {
  pedidoAgendado?: boolean
  slotInicio?: string | null
  slotFim?: string | null
  previsaoEntregaEm?: string | null
}

export type AgendaSlotDeliveryFormatado = {
  data: string
  horario: string
}

const TIMEZONE_PADRAO_BR = 'America/Sao_Paulo'

function formatarHoraEmTimezone(iso: string, timeZone: string): string | null {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return null
  }
}

function formatarDataDiaMesEmTimezone(iso: string, timeZone: string): string | null {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
    }).formatToParts(d)
    const day = parts.find(p => p.type === 'day')?.value
    const month = parts.find(p => p.type === 'month')?.value
    if (!day || !month) return null
    return `${day}-${month}`
  } catch {
    return null
  }
}

/** Data + janela de slot para pedido agendado (Kanban e Info Pedidos). */
export function formatarAgendaSlotDelivery(
  input: AgendaSlotDeliveryInput,
  timeZoneEmpresa: string = TIMEZONE_PADRAO_BR
): AgendaSlotDeliveryFormatado | null {
  if (!input.pedidoAgendado) return null

  const timeZone = timeZoneEmpresa.trim() || TIMEZONE_PADRAO_BR
  const inicio = input.slotInicio?.trim() || input.previsaoEntregaEm?.trim()
  const fim = input.slotFim?.trim()
  if (!inicio) return null

  const data = formatarDataDiaMesEmTimezone(inicio, timeZone)
  const hInicio = formatarHoraEmTimezone(inicio, timeZone)
  if (!data || !hInicio) return null

  const hFim = fim ? formatarHoraEmTimezone(fim, timeZone) : null
  const horario = hFim ? `${hInicio}–${hFim}` : hInicio

  return { data, horario }
}

/** Hora ou minutos previstos para exibição compacta no card delivery. */
export function formatarPrevisaoEntregaKanbanCard(
  venda: VendaUnificadaDTO,
  timeZoneEmpresa: string = TIMEZONE_PADRAO_BR
): PrevisaoEntregaKanbanCard | null {
  const timeZone = timeZoneEmpresa.trim() || TIMEZONE_PADRAO_BR

  const agenda = formatarAgendaSlotDelivery(
    {
      pedidoAgendado: venda.pedidoAgendado,
      slotInicio: venda.slotInicio,
      slotFim: venda.slotFim,
      previsaoEntregaEm: venda.previsaoEntregaEm,
    },
    timeZone
  )
  if (agenda) {
    return { kind: 'agendado', data: agenda.data, horario: agenda.horario }
  }

  const previsao = venda.previsaoEntregaEm?.trim()
  if (previsao) {
    const horaTz = formatarHoraEmTimezone(previsao, timeZone)
    if (horaTz) return { kind: 'texto', texto: horaTz }
    const hora = formatarHoraPrevisaoEntrega(previsao, venda.dataCriacao)
    return hora !== '—' ? { kind: 'texto', texto: hora } : null
  }

  const segundos = venda.tempoTotalEstimadoSegundos
  if (segundos != null && segundos > 0) {
    const minutos = Math.round(segundos / 60)
    return minutos > 0 ? { kind: 'texto', texto: `${minutos} min` } : null
  }

  return null
}

/** Forma de cobrança no card (antecipado vs na entrega/retirada). */
export function rotuloFormaCobrancaKanbanCard(
  tipoVenda: string | null | undefined,
  fluxo: FluxoPagamentoEntrega | null | undefined
): string | null {
  if (!fluxo) return null
  if (fluxo === 'ja_pago') return 'Já foi pago'

  const tipo = String(tipoVenda ?? '').trim().toLowerCase()
  if (tipo === 'retirada') return 'Cobrança na retirada'
  return 'Cobrar na entrega'
}

/** Nomes dos meios de pagamento das cobranças ativas (ex.: Dinheiro, PIX). */
export function formatarFormaPagamentoKanbanCard(
  cobrancas: CobrancaKanbanDeliveryResumo[] | undefined,
  nomesMeiosPagamento: Record<string, string>
): string | null {
  if (!cobrancas?.length) return null

  const nomes: string[] = []
  const idsVistos = new Set<string>()

  for (const cobranca of cobrancas) {
    if (cobranca.status === 'cancelada') continue
    const id = String(cobranca.meioPagamentoId ?? '').trim()
    if (!id || idsVistos.has(id)) continue
    idsVistos.add(id)
    const nome = nomesMeiosPagamento[id]?.trim()
    if (nome) nomes.push(nome)
  }

  return nomes.length > 0 ? nomes.join(', ') : null
}
