import type { Venda } from '../types'

export type TomTempoPedidoKanban = 'ok' | 'alerta' | 'atraso'

export interface RelogioPedidoKanban {
  minutosDecorridos: number | null
  minutosAtraso: number | null
  tom: TomTempoPedidoKanban
  rotuloDecorrido: string | null
  rotuloAtraso: string | null
  rotuloHa: string | null
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export function minutosDesdeIso(iso: string | null | undefined, agoraMs: number): number | null {
  const inicio = parseIsoMs(iso)
  if (inicio == null) return null
  return Math.max(0, Math.floor((agoraMs - inicio) / 60_000))
}

export function minutosAtrasoPrevisao(
  previsaoIso: string | null | undefined,
  agoraMs: number
): number | null {
  const previsao = parseIsoMs(previsaoIso)
  if (previsao == null) return null
  const atraso = Math.floor((agoraMs - previsao) / 60_000)
  return atraso > 0 ? atraso : 0
}

export function formatarMinutosCurto(minutos: number): string {
  if (minutos < 60) return `${minutos}min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto > 0 ? `${horas}h${resto}min` : `${horas}h`
}

/** Hora do pedido no cartão da Operação. Inclui dia se não for o mesmo dia civil. */
export function formatarQuandoPedidoKanban(
  iso: string | null | undefined,
  agoraMs: number
): string | null {
  const inicio = parseIsoMs(iso)
  if (inicio == null) return null
  const pedido = new Date(inicio)
  const agora = new Date(agoraMs)
  const mesmaDataCivil =
    pedido.getFullYear() === agora.getFullYear() &&
    pedido.getMonth() === agora.getMonth() &&
    pedido.getDate() === agora.getDate()
  const hora = pedido.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmaDataCivil) return hora
  const dia = String(pedido.getDate()).padStart(2, '0')
  const mes = String(pedido.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes} ${hora}`
}

export function tomTempoPedidoKanban(
  minutosDecorridos: number | null,
  minutosAtraso: number | null
): TomTempoPedidoKanban {
  if (minutosAtraso != null && minutosAtraso > 0) return 'atraso'
  if (minutosDecorridos != null && minutosDecorridos >= 20) return 'alerta'
  return 'ok'
}

export function relogioPedidoKanban(venda: Venda, agoraMs: number): RelogioPedidoKanban {
  const ancora = venda.dataUltimaModificacao || venda.dataCriacao
  const minutosDecorridos = minutosDesdeIso(ancora, agoraMs)
  const minutosAtraso = minutosAtrasoPrevisao(venda.previsaoEntregaEm, agoraMs)
  const tom = tomTempoPedidoKanban(minutosDecorridos, minutosAtraso)

  return {
    minutosDecorridos,
    minutosAtraso,
    tom,
    rotuloDecorrido: minutosDecorridos != null ? formatarMinutosCurto(minutosDecorridos) : null,
    rotuloAtraso:
      minutosAtraso != null && minutosAtraso > 0
        ? `Atraso ${formatarMinutosCurto(minutosAtraso)}`
        : null,
    rotuloHa: minutosDecorridos != null ? `há ${formatarMinutosCurto(minutosDecorridos)}` : null,
  }
}

export function pedidoTemPendenciaExpedicao(venda: Venda, agoraMs: number): boolean {
  if (venda.isCancelada()) return false
  if (venda.precisaConfirmarPagamentoParaFinalizar()) return true
  const atraso = minutosAtrasoPrevisao(venda.previsaoEntregaEm, agoraMs)
  return atraso != null && atraso > 0
}
