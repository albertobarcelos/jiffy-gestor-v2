import {
  TEMPO_PREPARO_ALERTA_RESTANTE_MIN,
  TEMPO_PREPARO_KANBAN_PADRAO_MIN,
} from '@/src/shared/constants/tempoPreparoKanban'
import type { ColunaKanbanId, Venda } from '../types'

export type TomTempoPedidoKanban = 'ok' | 'alerta' | 'atraso'

export interface RelogioPedidoKanban {
  minutosDecorridos: number | null
  minutosAtraso: number | null
  tom: TomTempoPedidoKanban
  rotuloDecorrido: string | null
  rotuloAtraso: string | null
  rotuloHa: string | null
}

export interface RelogioPedidoKanbanOpts {
  colunaId?: ColunaKanbanId | string
  slaPreparoMinutos?: number
  ancoraPreparoIso?: string | null
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export function segundosDesdeIso(iso: string | null | undefined, agoraMs: number): number | null {
  const inicio = parseIsoMs(iso)
  if (inicio == null) return null
  return Math.max(0, Math.floor((agoraMs - inicio) / 1000))
}

export function minutosDesdeIso(iso: string | null | undefined, agoraMs: number): number | null {
  const segundos = segundosDesdeIso(iso, agoraMs)
  if (segundos == null) return null
  return Math.floor(segundos / 60)
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

export function formatarCronometroMmSs(totalSegundos: number): string {
  const seguro = Math.max(0, Math.floor(totalSegundos))
  const horas = Math.floor(seguro / 3600)
  const minutos = Math.floor((seguro % 3600) / 60)
  const segundos = seguro % 60
  const mm = String(minutos).padStart(2, '0')
  const ss = String(segundos).padStart(2, '0')
  if (horas > 0) return `${horas}:${mm}:${ss}`
  return `${mm}:${ss}`
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
  minutosAtraso: number | null,
  slaPreparoMinutos = TEMPO_PREPARO_KANBAN_PADRAO_MIN
): TomTempoPedidoKanban {
  if (minutosAtraso != null && minutosAtraso > 0) return 'atraso'
  if (minutosDecorridos != null && minutosDecorridos >= slaPreparoMinutos) return 'alerta'
  return 'ok'
}

const COLUNAS_PREPARO_CONGELADO = new Set<string>(['PRONTO_ENTREGA', 'EM_ROTA', 'FINALIZADAS'])

export function ancoraEtapaKanban(
  venda: Venda,
  isoLocalTransicao?: string | null
): string | null {
  const ultimaApi = venda.dataUltimaModificacao?.trim() || null
  const local = isoLocalTransicao?.trim() || null
  if (local && (!ultimaApi || local > ultimaApi)) return local
  return ultimaApi || venda.dataCriacao || null
}

export function ancoraInicioPreparoKanban(
  venda: Venda,
  isoLocalTransicao?: string | null
): string | null {
  const persistido = venda.dataInicioPreparo?.trim()
  if (persistido) return persistido
  return ancoraEtapaKanban(venda, isoLocalTransicao)
}

export function minutosPreparoConcluido(venda: Venda): number | null {
  const segundos = segundosPreparoConcluido(venda)
  if (segundos == null) return null
  return Math.floor(segundos / 60)
}

export function segundosPreparoConcluido(venda: Venda): number | null {
  const inicio = parseIsoMs(venda.dataInicioPreparo)
  const fim = parseIsoMs(venda.dataFinalizacaoPreparo)
  if (inicio == null || fim == null) return null
  return Math.max(0, Math.floor((fim - inicio) / 1000))
}

function relogioCronometroPreparo(
  segundosDecorridos: number,
  slaPreparoMinutos: number
): RelogioPedidoKanban {
  const minutosDecorridos = Math.floor(segundosDecorridos / 60)
  const atrasoPreparo = minutosDecorridos > slaPreparoMinutos ? minutosDecorridos - slaPreparoMinutos : 0
  const tom: TomTempoPedidoKanban =
    atrasoPreparo > 0
      ? 'atraso'
      : minutosDecorridos >= slaPreparoMinutos - TEMPO_PREPARO_ALERTA_RESTANTE_MIN
        ? 'alerta'
        : 'ok'
  const rotulo = formatarCronometroMmSs(segundosDecorridos)

  return {
    minutosDecorridos,
    minutosAtraso: atrasoPreparo > 0 ? atrasoPreparo : null,
    tom,
    rotuloDecorrido: rotulo,
    rotuloAtraso: null,
    rotuloHa: rotulo,
  }
}

export function relogioPedidoKanban(
  venda: Venda,
  agoraMs: number,
  opts?: RelogioPedidoKanbanOpts
): RelogioPedidoKanban {
  const sla = Math.max(1, Math.floor(opts?.slaPreparoMinutos ?? TEMPO_PREPARO_KANBAN_PADRAO_MIN))
  const coluna = opts?.colunaId

  if (coluna === 'EM_PREPARO') {
    const ancora = ancoraInicioPreparoKanban(venda, opts?.ancoraPreparoIso)
    const segundosDecorridos = segundosDesdeIso(ancora, agoraMs)
    if (segundosDecorridos != null) return relogioCronometroPreparo(segundosDecorridos, sla)
  }

  if (coluna && COLUNAS_PREPARO_CONGELADO.has(coluna)) {
    const congelado = segundosPreparoConcluido(venda)
    if (congelado != null) return relogioCronometroPreparo(congelado, sla)
  }

  const ancora = venda.dataUltimaModificacao || venda.dataCriacao
  const minutosDecorridos = minutosDesdeIso(ancora, agoraMs)
  const minutosAtraso = minutosAtrasoPrevisao(venda.previsaoEntregaEm, agoraMs)
  const tom = tomTempoPedidoKanban(minutosDecorridos, minutosAtraso, sla)

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
